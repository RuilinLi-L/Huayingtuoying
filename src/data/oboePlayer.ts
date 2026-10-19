import media from './mediaAssets.json';
import type { EntryManifest } from '../types/manifest';
import { createSleepingBeautyAudioStem, getSleepingBeautyStemFile } from './sleepingBeauty';

export const oboePlayer: EntryManifest = {
  id: 'oboe-player',
  title: '双簧管演奏家',
  subtitle: '让乐手站上你的识别卡',
  description: '将测试卡平放在桌面，用手机对准卡片，观察双簧管人物的立体形象，听见木管声部的声音。',
  orchestraZone: '木管组', themeColor: '#65806b', sceneType: 'mindar-image',
  targetImage: '/assets/markers/default-card.png',
  trackingTargetSrc: '/assets/markers/default-card.mind',
  posterImage: '/assets/markers/default-card.png',
  modelUrl: media.models['oboe-player'],
  fallbackMode: 'model',
  audioStems: [{ ...createSleepingBeautyAudioStem('oboe', { stereoPan: 0, gain: 1 }),
    file: getSleepingBeautyStemFile('oboe', 'stage-mobile') }],
  knowledgeCards: [
    { id: 'oboe-voice', anchor: '聆听音色', title: '温暖而鲜明的木管声音',
      summary: '点击“双簧管试听”，聆听《睡美人圆舞曲》中的双簧管声部，留意它怎样与其他乐器呼应。' },
    { id: 'oboe-player-view', anchor: '观察人物', title: '从不同角度认识演奏家',
      summary: '扫描时围绕卡片移动手机，观察人物和乐器。普通 3D 预览支持拖动旋转和双指缩放。当前人物为静态模型。' },
  ],
  webar: {
    provider: '8thwall', defaultSceneId: 'space',
    scenes: [{id:'space', provider:'8thwall', trackingMode:'surface-placement', startMode:'manual', modelScale:{x:0.2,y:0.2,z:0.2},modelRotation:{x:0,y:0,z:0},modelPosition:{x:0,y:0,z:0},floating:false,placementPrompt:'缓慢移动手机，找到桌面或地面后点击放置。'}, { id: 'card', provider:'mindar', trackingMode: 'image-target', startMode: 'manual',
      target: { previewImage: '/assets/markers/default-card.png', trackingTargetSrc: '/assets/markers/default-card.mind', targetIndex: 0 },
      placementPrompt: '把测试卡平放在桌上，保持图案完整入镜，再缓慢移动手机。',
      modelPosition: { x: 0, y: 0, z: 0 }, modelScale: { x: 0.45, y: 0.45, z: 0.45 },
      modelRotation: { x: 90, y: 0, z: 0 }, floating: false, showTargetPlane: false, showHotspots: false,
    }],
  },
};
