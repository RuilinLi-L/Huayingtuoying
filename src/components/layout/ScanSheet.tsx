import { ArrowRight, Camera, Image as ImageIcon, Scan, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type QrScanner from 'qr-scanner';
import { resolveScanDestination } from '../../lib/scanDestination';
import '../../styles/scan-sheet.css';

export function ScanSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const resolvedRef = useRef(false);
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'scanning'>('idle');
  const [readingImage, setReadingImage] = useState(false);
  const [error, setError] = useState('');

  const closeSheet = () => {
    dialogRef.current?.close();
    onClose();
  };

  useEffect(() => {
    mountedRef.current = true;
    dialogRef.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      scannerRef.current?.destroy();
      scannerRef.current = null;
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const enterExperience = (data: string) => {
    if (!mountedRef.current || resolvedRef.current) return;
    const destination = resolveScanDestination(data);
    if (!destination) {
      setError('未识别到华音拓影体验，请扫描展签上的体验二维码。');
      return;
    }
    resolvedRef.current = true;
    scannerRef.current?.destroy();
    scannerRef.current = null;
    closeSheet();
    navigate(destination);
  };

  const startCamera = async () => {
    setError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('当前环境无法使用相机，请从相册选择二维码，或在浏览器中通过 HTTPS 打开。');
      return;
    }
    const request = ++requestRef.current;
    setCameraState('starting');
    let scanner: QrScanner | null = null;
    try {
      const { default: Scanner } = await import('qr-scanner');
      if (!mountedRef.current || request !== requestRef.current || !videoRef.current) return;
      scannerRef.current?.destroy();
      scanner = new Scanner(videoRef.current, (result) => enterExperience(result.data), {
        preferredCamera: 'environment',
        maxScansPerSecond: 8,
        returnDetailedScanResult: true,
      });
      scannerRef.current = scanner;
      await scanner.start();
      if (!mountedRef.current || request !== requestRef.current) {
        scanner.destroy();
        return;
      }
      setCameraState('scanning');
    } catch {
      scanner?.destroy();
      if (!mountedRef.current || request !== requestRef.current) return;
      scannerRef.current = null;
      setCameraState('idle');
      setError('相机未能开启，请检查相机权限或占用情况，也可以从相册选择二维码。');
    }
  };

  const readImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const request = ++requestRef.current;
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setCameraState('idle');
    setReadingImage(true);
    setError('');
    try {
      const { default: Scanner } = await import('qr-scanner');
      const result = await Scanner.scanImage(file, { returnDetailedScanResult: true });
      if (mountedRef.current && request === requestRef.current) enterExperience(result.data);
    } catch {
      if (mountedRef.current && request === requestRef.current) {
        setError('图片中没有识别到二维码，请选择清晰、完整的二维码图片。');
      }
    } finally {
      if (mountedRef.current && request === requestRef.current) setReadingImage(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="scan-sheet"
      aria-labelledby="scan-sheet-title"
      aria-describedby="scan-sheet-description"
      onCancel={(event) => { event.preventDefault(); closeSheet(); }}
      onClick={(event) => { if (event.target === event.currentTarget) closeSheet(); }}
    >
      <div className="scan-sheet__panel">
        <div className="scan-sheet__handle" aria-hidden="true" />
        <button className="scan-sheet__close" type="button" aria-label="关闭扫一扫" onClick={closeSheet}><X size={22} /></button>
        <span className="scan-sheet__eyebrow">开启一段音乐体验</span>
        <h2 id="scan-sheet-title">扫一扫</h2>
        <p id="scan-sheet-description">扫描展签或文创上的二维码，<br />进入对应的乐器与交响舞台。</p>
        <div className={`scan-sheet__viewfinder${cameraState === 'scanning' ? ' scan-sheet__viewfinder--active' : ''}`}>
          <video ref={videoRef} muted playsInline aria-label="扫码相机画面" />
          <div className="scan-sheet__guide" aria-hidden="true" />
          {cameraState !== 'scanning' ? (
            <div className="scan-sheet__placeholder"><Scan size={52} weight="light" /><span>{cameraState === 'starting' ? '正在开启相机…' : '将体验二维码放入框内'}</span></div>
          ) : <span className="scan-sheet__scanning" role="status">正在识别二维码…</span>}
        </div>
        {error ? <p className="scan-sheet__error" role="alert">{error}</p> : null}
        <div className="scan-sheet__actions">
          <button className="scan-sheet__start" type="button" disabled={cameraState !== 'idle' || readingImage} onClick={() => void startCamera()}>
            <Camera size={21} /><span>{cameraState === 'scanning' ? '正在扫码' : cameraState === 'starting' ? '正在开启…' : '开启相机扫码'}</span>
          </button>
          <button className="scan-sheet__album" type="button" disabled={readingImage || cameraState === 'starting'} onClick={() => fileRef.current?.click()}>
            <ImageIcon size={21} /><span>{readingImage ? '正在识别…' : '从相册选择'}</span>
          </button>
          <input ref={fileRef} className="sr-only" type="file" accept="image/*" aria-label="选择二维码图片" onChange={(event) => void readImage(event)} tabIndex={-1} />
        </div>
        <button className="scan-sheet__stage" type="button" onClick={() => { closeSheet(); navigate('/stage'); }}>
          <span>没有二维码？直接进入交响舞台</span><ArrowRight size={18} />
        </button>
      </div>
    </dialog>
  );
}
