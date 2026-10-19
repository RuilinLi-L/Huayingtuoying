import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { oboePlayer as entry } from '../data/oboePlayer';
import { AudioEngine } from '../lib/audio/AudioEngine';
import { getDeviceCapabilities } from '../lib/device';
import { resolveWebArScene } from '../lib/webar';
import { MindArScene } from '../components/ar/MindArScene';
import '../styles/character-experience.css';

const ModelViewer = lazy(() => import('../components/InstrumentModelViewer').then(module => ({ default: module.InstrumentModelViewer })));
const scene = resolveWebArScene(entry, 'manual');
const labels: Record<string, string> = {
  idle: '准备好一张测试卡', loading: '正在准备相机和模型…', scanning: '请对准完整的识别图',
  found: '识别成功，试着移动手机观察人物', lost: '目标暂时丢失，请重新对准', error: '暂时无法启动，请重试或查看 3D 预览',
};

export function CharacterExperiencePage() {
  const [mode, setMode] = useState<'idle' | 'ar' | 'model'>('idle');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [audioError, setAudioError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [capabilities] = useState(getDeviceCapabilities);
  const audioRef = useRef<AudioEngine | null>(null);
  const playingRequest = useRef(false);
  useEffect(() => {
    const engine = new AudioEngine(); audioRef.current = engine;
    const timer = window.setInterval(() => setPlaying(engine.isPlaying()), 500);
    return () => { window.clearInterval(timer); audioRef.current = null; engine.dispose(); };
  }, []);
  const toggleAudio = async () => {
    const engine = audioRef.current;
    if (!engine || playingRequest.current) return;
    if (engine.isPlaying()) { engine.pause(); setPlaying(false); return; }
    playingRequest.current = true; setAudioLoading(true); setAudioError('');
    try {
      const message = engine.getCurrentTime() > 0 ? await engine.resume() : await engine.play(entry.audioStems);
      if (audioRef.current !== engine) return;
      setAudioError(message ?? ''); setPlaying(engine.isPlaying());
    } catch (cause) {
      if (audioRef.current === engine) setAudioError(cause instanceof Error ? cause.message : '音频加载失败，请重试。');
    } finally { playingRequest.current = false; if (audioRef.current === engine) setAudioLoading(false); }
  };
  const onStatus = useCallback((value: string) => setStatus(value), []);
  const onError = useCallback((value: string) => setError(value), []);
  const ignoreDebug = useCallback(() => {}, []);
  const ignoreCard = useCallback(() => {}, []);
  const start = () => {
    setError('');
    if (!capabilities.canUseAr) { setMode('model'); return; }
    setStatus('loading'); setMode('ar');
  };
  return <main className="character-experience">
    <Link className="character-back" to="/stage">← 返回舞台</Link>
    <header><p className="eyebrow">木管组 · 摄像头 AR</p><h1>双簧管演奏家</h1>
      <p>让乐手站上你的识别卡。缓慢移动手机，从不同角度观察人物。</p></header>
    {capabilities.isEmbeddedBrowser && <p className="character-notice">请使用右上角菜单，在 {capabilities.isIPhone ? 'Safari' : 'Chrome'} 中打开，再开始扫描。</p>}
    {!capabilities.canUseAr && <p className="character-notice">{!capabilities.secureContext ? '相机需要 HTTPS 安全连接。' : '当前浏览器无法访问相机。'}你仍然可以查看普通 3D 预览和试听音频。</p>}
    <section className="character-card">
      <h2 aria-live="polite">{mode === 'model' ? '双簧管 3D 预览' : labels[status] ?? labels.idle}</h2>
      {mode === 'ar' ? <MindArScene entry={entry} scene={scene} onStatusChange={onStatus} onError={onError} onDebug={ignoreDebug} onSelectCard={ignoreCard} />
        : mode === 'model' ? <Suspense fallback={<p>正在准备 3D 预览…</p>}><ModelViewer modelUrl={entry.modelUrl} title={entry.title} accentColor={entry.themeColor!} /></Suspense>
        : <div className="character-instructions"><img src={entry.targetImage} alt="摄像头需要识别的测试卡图案" />
          <ol><li>下载测试卡，打印出来或放在另一块屏幕上。</li><li>将卡片平放，保持图案完整、光线均匀。</li><li>点击开始扫描，允许相机访问并对准卡片。</li></ol></div>}
      {error && mode !== 'ar' && <p role="alert">{error}</p>}
      <div className="character-actions">
        {mode !== 'ar' && capabilities.canUseAr && <button className="button" type="button" onClick={start}>开始扫描</button>}
        {mode === 'ar' && <button className="button--ghost" type="button" onClick={() => { setMode('idle'); setStatus('idle'); setError(''); }}>关闭相机</button>}
        {mode !== 'model' && <button className="button--ghost" type="button" onClick={() => { setMode('model'); setError(''); }}>普通 3D 预览</button>}
        <a className="button--ghost" href={entry.targetImage} download="双簧管AR测试卡.png">下载测试卡</a>
        <a className="button--ghost" href={entry.targetImage} target="_blank" rel="noreferrer">查看识别图</a>
      </div>
      <p className="character-caption">请扫描这张测试卡；二维码、其他图片或摆件本身不会触发人物。卡片离开画面时人物会隐藏，重新对准后恢复。</p>
    </section>
    <section className="character-card"><h2>听见双簧管</h2><p>聆听《睡美人圆舞曲》中的双簧管声部。扫描不会自动播放声音。</p>
      <button type="button" className="button" disabled={audioLoading} onClick={() => void toggleAudio()}>{audioLoading ? '音频加载中…' : playing ? '暂停试听' : '双簧管试听'}</button>
      {audioError && <p role="alert">{audioError}</p>}
      {entry.knowledgeCards.map(card => <div className="character-knowledge" key={card.id}><h3>{card.title}</h3><p>{card.summary}</p></div>)}
    </section>
  </main>;
}
