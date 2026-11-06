/**
 * Inquiry form behaviour: validation, photo picker (drag & drop, thumbnails,
 * limits), image downscaling, and submission to /api/inquiry.
 */

const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per original photo
// Netlify synchronous functions accept ~6 MB request bodies (base64-encoded
// internally), so keep the total upload comfortably below that.
const UPLOAD_BUDGET_BYTES = 4 * 1024 * 1024;
const ENDPOINT = '/api/inquiry';
const FAIL_HTML =
  'Something went wrong — please call <a href="tel:+19523338665">952-333-8665</a> or email <a href="mailto:hello@frenchlakebuild.com">hello@frenchlakebuild.com</a>.';

const DEFAULT_DROP_TITLE = 'Add photos of the rooms you’d like to change';

const isImage = (f: File) =>
  f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|gif)$/i.test(f.name);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normaliseUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return '';
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes('.')) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Downscale an image in the browser. Returns the original file if it can't be decoded (e.g. HEIC outside Safari). */
async function downscale(file: File, maxEdge: number, quality: number): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) return file;
    return blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function jpgName(name: string) {
  return name.replace(/\.[^.]+$/, '') + '.jpg';
}

export function initInquiryForm(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('form')!;
  const success = root.querySelector<HTMLElement>('[data-success]')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const submit = root.querySelector<HTMLButtonElement>('[data-submit]')!;
  const fileInput = root.querySelector<HTMLInputElement>('[data-file-input]')!;
  const drop = root.querySelector<HTMLElement>('[data-drop]')!;
  const dropTitle = root.querySelector<HTMLElement>('[data-drop-title]')!;
  const thumbs = root.querySelector<HTMLUListElement>('[data-thumbs]')!;
  const photosErr = document.getElementById(fileInput.getAttribute('aria-describedby')!)!;

  let files: File[] = [];
  const previewUrls = new Map<File, string>();

  /* ---------- Field errors ---------- */
  const setError = (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, msg: string) => {
    const err = document.getElementById(el.getAttribute('aria-describedby') || '');
    if (msg) {
      el.setAttribute('aria-invalid', 'true');
      if (err) { err.textContent = msg; err.hidden = false; }
    } else {
      el.removeAttribute('aria-invalid');
      if (err) { err.textContent = ''; err.hidden = true; }
    }
  };

  const validators: Record<string, (v: string) => string> = {
    first_name: (v) => (v.trim() ? '' : 'Please enter your first name.'),
    last_name: (v) => (v.trim() ? '' : 'Please enter your last name.'),
    email: (v) => (!v.trim() ? 'Please enter your email address.' : EMAIL_RE.test(v.trim()) ? '' : 'Please enter a valid email address, like name@example.com.'),
    phone: (v) => (!v.trim() ? 'Please enter a phone number.' : v.replace(/\D/g, '').length >= 10 ? '' : 'Please enter a full phone number, including area code.'),
    address: (v) => (v.trim() ? '' : 'Please enter the property address.'),
    goals: (v) => (v.trim() ? '' : 'Please tell us a little about your project.'),
    inspiration_url: (v) => (normaliseUrl(v) === null ? 'Please enter a full link, like https://pinterest.com/…' : ''),
  };

  const fieldFor = (name: string) =>
    form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;

  const validateField = (name: string) => {
    const el = fieldFor(name);
    if (!el) return true;
    const msg = validators[name](el.value);
    setError(el, msg);
    return !msg;
  };

  // Validate on blur; once a field has shown an error, re-validate as the user types.
  Object.keys(validators).forEach((name) => {
    const el = fieldFor(name);
    if (!el) return;
    el.addEventListener('blur', () => { if (el.value || el.hasAttribute('aria-invalid')) validateField(name); });
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (el.hasAttribute('aria-invalid')) validateField(name);
    });
  });

  /* ---------- Photos ---------- */
  const setPhotoError = (msg: string) => {
    photosErr.textContent = msg;
    photosErr.hidden = !msg;
    drop.classList.toggle('is-invalid', !!msg);
    if (msg) fileInput.setAttribute('aria-invalid', 'true');
    else fileInput.removeAttribute('aria-invalid');
  };

  const renderFiles = () => {
    const n = files.length;
    dropTitle.textContent = n ? `${n} photo${n === 1 ? '' : 's'} attached` : DEFAULT_DROP_TITLE;
    thumbs.hidden = n === 0;
    thumbs.replaceChildren(
      ...files.map((f, i) => {
        const li = document.createElement('li');
        let url = previewUrls.get(f);
        if (!url) { url = URL.createObjectURL(f); previewUrls.set(f, url); }
        const img = document.createElement('img');
        img.alt = '';
        img.src = url;
        // HEIC won't preview in most browsers — show the file name instead.
        img.addEventListener('error', () => {
          img.remove();
          const span = document.createElement('span');
          span.className = 'thumb__name';
          span.textContent = f.name;
          li.prepend(span);
        });
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = '<span aria-hidden="true">×</span>';
        btn.setAttribute('aria-label', `Remove ${f.name}`);
        btn.addEventListener('click', () => {
          const u = previewUrls.get(f);
          if (u) { URL.revokeObjectURL(u); previewUrls.delete(f); }
          files.splice(i, 1);
          setPhotoError('');
          renderFiles();
          (thumbs.querySelectorAll('button')[Math.min(i, files.length - 1)] as HTMLButtonElement | undefined ?? fileInput).focus();
        });
        li.append(img, btn);
        return li;
      }),
    );
  };

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const problems: string[] = [];
    for (const f of incoming) {
      if (!isImage(f)) { problems.push(`“${f.name}” isn’t a photo — please use JPG, PNG or HEIC.`); continue; }
      if (f.size > MAX_FILE_BYTES) { problems.push(`“${f.name}” is larger than 10 MB.`); continue; }
      if (files.some((x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified)) continue;
      if (files.length >= MAX_FILES) { problems.push(`You can attach up to ${MAX_FILES} photos.`); break; }
      files.push(f);
    }
    setPhotoError(problems.join(' '));
    renderFiles();
  };

  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) addFiles(fileInput.files);
    fileInput.value = ''; // allow re-selecting the same file after removal
  });

  ['dragenter', 'dragover'].forEach((t) =>
    drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-dragover'); }),
  );
  ['dragleave', 'dragend', 'drop'].forEach((t) =>
    drop.addEventListener(t, () => drop.classList.remove('is-dragover')),
  );
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    const dt = (e as DragEvent).dataTransfer;
    if (dt?.files?.length) addFiles(dt.files);
  });

  /* ---------- Submit ---------- */
  const prepareUploads = async (): Promise<{ blob: Blob; name: string }[] | null> => {
    const attempt = async (edge: number, q: number) =>
      Promise.all(files.map(async (f) => {
        const blob = await downscale(f, edge, q);
        return { blob, name: blob === f ? f.name : jpgName(f.name) };
      }));
    let out = await attempt(2000, 0.82);
    const total = (arr: { blob: Blob }[]) => arr.reduce((s, x) => s + x.blob.size, 0);
    if (total(out) > UPLOAD_BUDGET_BYTES) out = await attempt(1400, 0.72);
    if (total(out) > UPLOAD_BUDGET_BYTES) return null;
    return out;
  };

  const showStatus = (html: string) => {
    status.innerHTML = html;
    status.hidden = false;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.hidden = true;

    const results = Object.keys(validators).map((n) => validateField(n));
    if (results.includes(false) || !photosErr.hidden) {
      const firstInvalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Sending…';

    try {
      const uploads = await prepareUploads();
      if (uploads === null) {
        setPhotoError('Those photos are too large to send together. Please remove a few, or email them to hello@frenchlakebuild.com after you send this form.');
        fileInput.focus();
        return;
      }

      const data = new FormData(form);
      const url = normaliseUrl(String(data.get('inspiration_url') || ''));
      data.set('inspiration_url', url || '');
      for (const u of uploads) data.append('photos', u.blob, u.name);

      const res = await fetch(ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json().catch(() => ({}));
      if (body && body.ok === false) throw new Error(body.error || 'Rejected');

      // Success: replace the panel with the thank-you message.
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
      form.hidden = true;
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch (err) {
      console.error('Inquiry failed', err);
      showStatus(FAIL_HTML);
      status.focus?.();
    } finally {
      submit.disabled = false;
      submit.textContent = submit.dataset.label || 'Send inquiry';
    }
  });
}
