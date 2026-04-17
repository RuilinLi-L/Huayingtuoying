import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrPreview({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    void QRCode.toDataURL(value, {
      margin: 1,
      width: 220,
      color: {
        dark: '#243128',
        light: '#ffffff',
      },
    }).then((nextDataUrl: string) => {
      if (!cancelled) {
        setDataUrl(nextDataUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <figure className="qr-preview">
      {dataUrl ? <img src={dataUrl} alt={label} /> : <div className="qr-placeholder" />}
      <figcaption>{label}</figcaption>
    </figure>
  );
}
