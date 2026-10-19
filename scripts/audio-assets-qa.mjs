// Verify every published sample, including the final short segment.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
const ffmpeg=process.env.FFMPEG??'ffmpeg';
const media=JSON.parse(await readFile('src/data/mediaAssets.json','utf8'));
const originalDir=resolve('public/assets/audio/The Sleeping Beauty Waltz');
const originals=(await readdir(originalDir)).filter(f=>f.endsWith('.mp3'));
const directory=await mkdtemp(join(tmpdir(),'orchestra-pcm-'));
try{
 let sharedFrames;
 for(const [id,audio] of Object.entries(media.audio)){
  const manifestPath=resolve('public'+audio.segmentManifest),m=JSON.parse(await readFile(manifestPath,'utf8'));let frame=0;
  const files=[];
  for(const s of m.segments){assert.equal(s.startFrame,frame,id);assert.equal(s.trimStartFrames,0);frame+=s.frameCount;const file=resolve(dirname(manifestPath),s.file);assert.equal((await readFile(file)).length,s.bytes);files.push(file)}
  assert.equal(frame,m.totalFrames,id);sharedFrames??=frame;assert.equal(frame,sharedFrames,'all voices must have identical length');
  const source=originals.find(f=>f.split('_')[0].toLowerCase().replace('trumbone','trombone')===id);assert.ok(source);
  const list=join(directory,'segments.txt');await writeFile(list,files.map(f=>"file '"+f.replaceAll("'","'\\''")+"'").join('\n'));
  const output=['-map','0:a:0','-ar',String(m.sampleRate),'-ac',String(m.channels),'-c:a','pcm_s16le','-f','hash','-hash','sha256','pipe:1'];
  const original=execFileSync(ffmpeg,['-v','error','-i',join(originalDir,source),...output],{encoding:'utf8'});
  const segmented=execFileSync(ffmpeg,['-v','error','-f','concat','-safe','0','-i',list,...output],{encoding:'utf8'});
  assert.equal(segmented,original,id+' PCM changed or segment seam lost samples');console.log('PASS',id,frame,'frames, full decoded PCM matches original');
 }
}finally{await rm(directory,{recursive:true,force:true})}
