// Common helpers shared by all tool pages
window.RDX = {
  async post(url, body, isJson = true) {
    const opts = { method: "POST" };
    if (isJson) {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    } else {
      opts.body = body;
    }
    const r = await fetch(url, opts);
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await r.json();
      if (!r.ok || j.success === false)
        throw new Error(j.error || `Error ${r.status}`);
      return j;
    }
    if (!r.ok) throw new Error(`Error ${r.status}`);
    return r;
  },

  async postBlob(url, body, isJson = true) {
    const opts = { method: "POST" };
    if (isJson) {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    } else {
      opts.body = body;
    }
    const r = await fetch(url, opts);
    if (!r.ok) {
      let msg = `Error ${r.status}`;
      try {
        const j = await r.json();
        msg = j.error || msg;
      } catch {}
      throw new Error(msg);
    }
    const cd = r.headers.get("content-disposition") || "";
    const m = /filename="?([^"]+)"?/.exec(cd);
    const filename = m ? m[1] : "rdx_download";
    const blob = await r.blob();
    return { blob, filename };
  },

  saveBlob({ blob, filename }) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);
  },

  showAlert(el, msg, type = "error") {
    el.className = `alert show ${type}`;
    el.textContent = msg;
  },

  hideAlert(el) {
    el.className = "alert";
    el.textContent = "";
  },

  setLoading(btn, loading, label) {
    if (loading) {
      btn.dataset.label = btn.innerHTML;
      btn.innerHTML = `<span class="spinner"></span> ${label || "Processing..."}`;
      btn.disabled = true;
    } else {
      btn.innerHTML = btn.dataset.label || label || "Submit";
      btn.disabled = false;
    }
  },

  fileToDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  },
};
