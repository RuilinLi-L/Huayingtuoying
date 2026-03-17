const scriptRegistry = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  if (scriptRegistry.has(src)) {
    return scriptRegistry.get(src)!;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-src="${src}"]`,
    );

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error(`脚本加载失败：${src}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.src = src;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      'error',
      () => reject(new Error(`脚本加载失败：${src}`)),
      { once: true },
    );
    document.body.appendChild(script);
  });

  scriptRegistry.set(src, promise);
  return promise;
}
