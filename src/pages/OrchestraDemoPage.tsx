import { ProjectorScreenChart } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { MusicianInsightPanel } from '../components/demo/MusicianInsightPanel';
import { NfcDeckPanel } from '../components/demo/NfcDeckPanel';
import { OrchestraStage } from '../components/demo/OrchestraStage';
import { fixedComposition, musicians } from '../data/orchestraDemo';
import { useOrchestraSession } from '../features/orchestra/useOrchestraSession';
import { describeLineup } from '../lib/orchestraSession';

export function OrchestraDemoPage() {
  const {
    snapshot,
    nfcError,
    mockAdapter,
    reservedAdapter,
    nfcPreviewPayload,
    videoRef,
    cameraReady,
    cameraError,
    openStage,
    stopStage,
    mode,
    highlightIds,
    currentScene,
    sceneOptions,
    focusedMusician,
    focusedMusicianId,
    isPlaying,
    playbackTime,
    duration,
    audioError,
    toggleMusician,
    togglePlayback,
    seek,
    changeScene,
    selectMusician,
  } = useOrchestraSession();

  return (
    <div className="page orchestra-page">
      <section className="orchestra-hero">
        <div className="orchestra-hero__content" data-reveal>
          <div>
            <p className="eyebrow">Base Demo</p>
            <h1>智能底座演示</h1>
          </div>
          <p className="orchestra-hero__summary">
            落子识别、分轨播放、舞台切换和数字名片集中在同一座虚拟音乐厅里，适合展陈现场直接讲解。
          </p>
        </div>

        <div className="orchestra-hero__actions" data-reveal>
          <button className="button" onClick={() => void openStage()} type="button">
            <ProjectorScreenChart size={18} weight="regular" />
            <span>打开舞台</span>
          </button>
          <Link className="button--ghost" to="/">
            <span>返回总览</span>
          </Link>
        </div>

        <dl className="orchestra-hero__status" data-reveal>
          <div className="status-metric">
            <dt>当前玩法</dt>
            <dd>{mode.name}</dd>
          </div>
          <div className="status-metric">
            <dt>识别结果</dt>
            <dd>{snapshot.detectedCount} / 12</dd>
          </div>
          <div className="status-metric">
            <dt>当前场景</dt>
            <dd>{currentScene.shortLabel}</dd>
          </div>
        </dl>
      </section>

      <section className="orchestra-layout">
        <div className="orchestra-layout__main">
          {audioError ? (
            <div className="status-message status-message--error">
              <strong>音频加载失败</strong>
              <p>{audioError}</p>
            </div>
          ) : null}
          {nfcError ? (
            <div className="status-message status-message--error">
              <strong>NFC 会话异常</strong>
              <p>{nfcError}</p>
            </div>
          ) : null}

          <OrchestraStage
            cameraError={cameraError}
            cameraReady={cameraReady}
            composition={fixedComposition}
            currentScene={currentScene}
            currentTime={playbackTime}
            duration={duration}
            focusedMusicianId={focusedMusicianId}
            highlightIds={highlightIds}
            isPlaying={isPlaying}
            mode={mode}
            musicians={musicians}
            onCloseStage={stopStage}
            onOpenStage={() => void openStage()}
            onSceneChange={changeScene}
            onSeek={seek}
            onSelectMusician={selectMusician}
            onTogglePlayback={() => void togglePlayback()}
            sceneOptions={sceneOptions}
            selectedIds={snapshot.placedMusicianIds}
            videoRef={videoRef}
          />
        </div>

        <div className="orchestra-layout__side">
          <NfcDeckPanel
            mockAdapter={mockAdapter}
            onToggleMusician={toggleMusician}
            reservedAdapter={reservedAdapter}
            selectedIds={snapshot.placedMusicianIds}
            snapshot={snapshot}
          />

          <MusicianInsightPanel
            composition={fixedComposition}
            mode={mode}
            musician={focusedMusician}
            scene={currentScene}
            selectedIds={snapshot.placedMusicianIds}
          />
        </div>
      </section>

      <section className="orchestra-details" aria-label="底座演示说明">
        <details className="demo-disclosure">
          <summary>
            <span>玩法联动</span>
            <small>查看识别结果如何驱动舞台、场景与解释层</small>
          </summary>
          <div className="mode-overview__grid">
            <article className="mode-overview__card">
              <small>落子结果</small>
              <strong>{describeLineup(snapshot.placedMusicianIds)}</strong>
              <p>{mode.description}</p>
            </article>
            <article className="mode-overview__card">
              <small>高亮乐手</small>
              <strong>{highlightIds.length} 位</strong>
              <p>舞台会按当前组合突出重点乐手，其余角色自动弱化，方便现场讲解。</p>
            </article>
            <article className="mode-overview__card">
              <small>推荐场景</small>
              <strong>
                {sceneOptions
                  .map((scene) => scene.shortLabel)
                  .join(' / ')}
              </strong>
              <p>场景切换不会影响全局播放进度，方便在展示中快速对比不同视觉语境。</p>
            </article>
          </div>
        </details>

        <details className="demo-disclosure">
          <summary>
            <span>NFC 接口与 payload</span>
            <small>硬件替换边界和当前模拟识别数据</small>
          </summary>
          <div className="nfc-bridge-card__body">
            <p>NFC 只负责提供会话快照，页面继续复用同一套舞台、播放和数字名片逻辑。</p>
            <code className="payload-code">
              {`interface NfcSessionAdapter {
  connect(): Promise<void>
  getSnapshot(): Promise<NfcSessionSnapshot>
  subscribe(listener): () => void
}`}
            </code>
            <code className="payload-code">
              {JSON.stringify(nfcPreviewPayload, null, 2)}
            </code>
          </div>
        </details>
      </section>
    </div>
  );
}
