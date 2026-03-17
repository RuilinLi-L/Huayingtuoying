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
    void QRCode.toDataURL(value, {
      margin: 1,
      width: 220,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    }).then(setDataUrl);
  }, [value]);

  return (
    <figure className="qr-preview">
      {dataUrl ? <img src={dataUrl} alt={label} /> : <div className="qr-placeholder" />}
      <figcaption>{label}</figcaption>
    </figure>
  );
}
