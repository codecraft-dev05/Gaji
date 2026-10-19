 // @ts-nocheck 
/* =========================================
   FIREBASE
========================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBwnZL3GExelY7rkNMJeUimjKxqCTRqbMg",
  authDomain: "gaji-853e4.firebaseapp.com",
  projectId: "gaji-853e4",
  storageBucket: "gaji-853e4.firebasestorage.app",
  messagingSenderId: "833894034111",
  appId: "1:833894034111:web:a15dc028d6c4301785740a"
};

/* =========================================
   SUARA OTOMATIS
========================================= */

function suara(teks) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const ucapan = new SpeechSynthesisUtterance(teks);
  ucapan.lang = "id-ID";
  ucapan.rate = 1;
  ucapan.pitch = 1;
  ucapan.volume = 1;

  window.speechSynthesis.speak(ucapan);
}

/* =========================================
   PENYIMPANAN DATA
========================================= */

const COLS = ["cafes", "pesanan", "kasbon", "riwayat"];

const DATA = {
  cafes: [],
  pesanan: [],
  kasbon: [],
  riwayat: []
};

let db = null;
const useFirebase = !!firebaseConfig.apiKey;

function initStore() {
  if (useFirebase) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      db = firebase.firestore();

      COLS.forEach(c => {
        db.collection(c).onSnapshot(
          snapshot => {
            DATA[c] = snapshot.docs.map(d => ({
              id: d.id,
              ...d.data()
            }));

            render();
          },
          error => {
            console.error(error);
            toast("⚠️ Gagal terhubung Firebase: " + error.code);
          }
        );
      });

      setMode("🔥 Firebase");
      return;
    } catch (error) {
      console.error(error);
      toast("⚠️ Firebase gagal dijalankan");
    }
  }

  COLS.forEach(c => {
    DATA[c] = JSON.parse(
      localStorage.getItem("sms_" + c) || "[]"
    );
  });

  setMode("📱 Lokal");
  render();
}

function setMode(teks) {
  $("modeLabel").textContent = teks;
}

function saveLocal(c) {
  localStorage.setItem("sms_" + c, JSON.stringify(DATA[c]));
}

async function dbAdd(c, obj) {
  obj.waktu = Date.now();

  if (db) {
    await db.collection(c).add(obj);
  } else {
    obj.id = "l" + Date.now() +
      Math.random().toString(36).slice(2, 6);

    DATA[c].push(obj);
    saveLocal(c);
    render();
  }
}

async function dbDel(c, id) {
  if (db) {
    await db.collection(c).doc(id).delete();
  } else {
    DATA[c] = DATA[c].filter(x => x.id !== id);
    saveLocal(c);
    render();
  }
}

async function dbClear(c) {
  if (db) {
    const batch = db.batch();

    DATA[c].forEach(item => {
      batch.delete(db.collection(c).doc(item.id));
    });

    await batch.commit();
  } else {
    DATA[c] = [];
    saveLocal(c);
    render();
  }
}

/* =========================================
   FUNGSI BANTU
========================================= */

const $ = id => document.getElementById(id);

const rp = n =>
  "Rp" + Math.round(n).toLocaleString("id-ID");

const num = n =>
  Math.round(n).toLocaleString("id-ID");

const esc = s =>
  String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[m]);

const tgl = t =>
  new Date(t).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

const byNew = arr =>
  [...arr].sort((a, b) => (b.waktu || 0) - (a.waktu || 0));

function toast(teks) {
  const el = $("toast");
  el.textContent = teks;
  el.classList.add("show");

  clearTimeout(el._t);

  el._t = setTimeout(() => {
    el.classList.remove("show");
  }, 2300);
}

function konfirmasi(emoji, teks) {
  return new Promise(resolve => {
    $("mE").textContent = emoji;
    $("mT").textContent = teks;
    $("modal").classList.remove("hidden");

    const selesai = jawaban => {
      $("modal").classList.add("hidden");
      resolve(jawaban);
    };

    $("mYes").onclick = () => selesai(true);
    $("mNo").onclick = () => selesai(false);
  });
}

const empty = (emoji, teks) =>
  `<div class="empty"><b>${emoji}</b>${teks}</div>`;

/* =========================================
   MULAI APLIKASI
========================================= */

function masuk() {
  $("landing").classList.add("hidden");
  $("app").classList.remove("hidden");

  window.scrollTo(0, 0);

  suara("Selamat datang di Sinar Mulia Sablon. Semangat bekerja!");

  if (!window._init) {
    window._init = true;
    initStore();
  }
}

/* =========================================
   NAVIGASI MENU
========================================= */

$("nav").addEventListener("click", event => {
  const tombol = event.target.closest("button");
  if (!tombol) return;

  document.querySelectorAll("nav button").forEach(el => {
    el.classList.toggle("active", el === tombol);
  });

  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle(
      "active",
      page.id === "p-" + tombol.dataset.p
    );
  });

  window.scrollTo(0, 0);
});

/* =========================================
   TAMBAH CAFE
========================================= */

async function tambahCafe() {
  const nama = $("inCafe").value.trim();
  const tarif = parseFloat($("inTarif").value);

  if (!nama) {
    toast("⚠️ Isi nama cafe dulu");
    return;
  }

  if (!(tarif > 0)) {
    toast("⚠️ Tarif tidak valid");
    return;
  }

  try {
    await dbAdd("cafes", { nama, tarif });

    toast("✅ Cafe tersimpan");
    suara("Cafe " + nama + " berhasil dicatat.");

    $("inCafe").value = "";
    $("inTarif").value = 50;
  } catch (error) {
    console.error(error);
    toast("❌ Gagal menyimpan cafe");
  }
}

/* =========================================
   TAMBAH PESANAN
========================================= */

async function tambahPesanan() {
  const id = $("selCafe").value;
  const cup = parseInt($("inCup").value, 10);

  const cafe = DATA.cafes.find(c => c.id === id);

  if (!cafe) {
    toast("⚠️ Pilih cafe dulu (tambah di menu Cafe)");
    return;
  }

  if (!(cup > 0)) {
    toast("⚠️ Isi jumlah cup");
    return;
  }

  try {
    await dbAdd("pesanan", {
      cafeId: id,
      cafeNama: cafe.nama,
      cup,
      tarif: cafe.tarif,
      total: cup * cafe.tarif
    });

    toast("✅ Pesanan tersimpan");

    suara(
      "Pesanan Cafe " + cafe.nama +
      " sebanyak " + cup +
      " cup berhasil ditambahkan."
    );

    $("inCup").value = "";
    hitungPreview();
  } catch (error) {
    console.error(error);
    toast("❌ Gagal menyimpan pesanan");
  }
}

/* =========================================
   TAMBAH KASBON
========================================= */

async function tambahKasbon() {
  const jumlah = parseFloat($("inKasbon").value);

  if (!(jumlah > 0)) {
    toast("⚠️ Isi jumlah kasbon");
    return;
  }

  try {
    await dbAdd("kasbon", { jumlah });

    toast("✅ Kasbon tersimpan");
    suara("Catatan kasbon berhasil ditambahkan.");

    $("inKasbon").value = "";
  } catch (error) {
    console.error(error);
    toast("❌ Gagal menyimpan kasbon");
  }
}

/* =========================================
   HAPUS DATA
========================================= */

async function hapus(col, id, emoji, teks) {
  if (!await konfirmasi(emoji, teks)) return;

  const item = DATA[col].find(x => x.id === id);

  if (!item) {
    toast("⚠️ Data tidak ditemukan");
    return;
  }

  let ucapan = "Data berhasil dihapus.";

  if (col === "pesanan") {
    ucapan = "Pesanan Cafe " + item.cafeNama +
      " berhasil dihapus.";
  } else if (col === "cafes") {
    ucapan = "Cafe " + item.nama +
      " berhasil dihapus dari daftar.";
  } else if (col === "kasbon") {
    ucapan = "Catatan kasbon berhasil dihapus.";
  } else if (col === "riwayat") {
    ucapan = "Riwayat gaji berhasil dihapus.";
  }

  try {
    await dbDel(col, id);

    toast("🗑️ Terhapus");
    suara(ucapan);
  } catch (error) {
    console.error(error);
    toast("❌ Gagal menghapus data");
  }
}
  

/* =========================================
   GAJI DITERIMA
========================================= */

async function gajiDiterima() {
 const sandi = prompt("🔐 Masukkan sandi untuk menerima gaji:");

if (sandi !== "SMS") {
  toast("❌ Sandi salah");
  return;
}
  const h = hitung();

  if (h.jml === 0 && h.kasbon === 0) {
    toast("⚠️ Belum ada data untuk digaji");
    return;
  }

  const setuju = await konfirmasi(
    "💰",
    "Gaji sebesar " + rp(h.gaji) +
    " sudah diterima? Pemesanan, pendapatan & kasbon akan di-reset ke 0 (daftar cafe tetap)."
  );

  if (!setuju) return;

  try {
    const namaCafeSelesai = [
      ...new Set(DATA.pesanan.map(p => p.cafeNama))
    ];

    await dbAdd("riwayat", {
      totalCup: h.cup,
      jumlahPesanan: h.jml,
      pendapatan: h.pend,
      kasbon: h.kasbon,
      gaji: h.gaji
    });

    await dbClear("pesanan");
    await dbClear("kasbon");

    toast("🎉 Gaji diterima! Data di-reset");

suara("Terima kasih, Gilang! Gaji sudah diterima. " +
  "Kerja bagus hari ini. Semoga selalu semangat dan sukses!);
        
    
  } catch (error) {
    console.error(error);
    toast("❌ Gagal menyimpan penerimaan gaji");
  }
}


/* =========================================
   HITUNG DATA
========================================= */

function hitung() {
  const cup = DATA.pesanan.reduce(
    (a, x) => a + Number(x.cup || 0), 0
  );

  const pend = DATA.pesanan.reduce(
    (a, x) => a + Number(x.total || 0), 0
  );

  const kasbon = DATA.kasbon.reduce(
    (a, x) => a + Number(x.jumlah || 0), 0
  );

  return {
    cup,
    pend,
    kasbon,
    jml: DATA.pesanan.length,
    gaji: pend - kasbon
  };
}

function hitungPreview() {
  const pilih = $("selCafe");
  const inputCup = $("inCup");

  const cafe = DATA.cafes.find(c => c.id === pilih.value);
  const cup = parseInt(inputCup.value, 10);

  $("prevHitung").innerHTML = (cafe && cup > 0)
    ? `🧮 ${num(cup)} cup × ${num(cafe.tarif)} = <b>${rp(cup * cafe.tarif)}</b>`
    : "Pilih cafe &amp; isi jumlah cup";
}

$("inCup").addEventListener("input", hitungPreview);
$("selCafe").addEventListener("change", hitungPreview);

/* =========================================
   TAMPILKAN SEMUA DATA
========================================= */

function render() {
  const h = hitung();

  /* PILIHAN CAFE */
  const sel = $("selCafe");
  const cur = sel.value;

  const cafes = [...DATA.cafes].sort(
    (a, b) => a.nama.localeCompare(b.nama)
  );

  sel.innerHTML = cafes.length
    ? cafes.map(c =>
        `<option value="${esc(c.id)}">☕ ${esc(c.nama)} (Rp${num(c.tarif)}/cup)</option>`
      ).join("")
    : '<option value="">— Belum ada cafe —</option>';

  if (cafes.some(c => c.id === cur)) {
    sel.value = cur;
  }

  hitungPreview();

  /* DAFTAR PESANAN */
  $("listPesan").innerHTML = DATA.pesanan.length
    ? byNew(DATA.pesanan).map(p => `
      <div class="item">
        <div class="ic">🥤</div>
        <div class="info">
          <div class="t">${esc(p.cafeNama)}</div>
          <div class="s">${num(p.cup)} cup × ${num(p.tarif)} • ${tgl(p.waktu)}</div>
        </div>
        <div class="v">${rp(p.total)}</div>
        <button class="del" onclick="hapus('pesanan','${esc(p.id)}','🗑️','Hapus pesanan ini?')">🗑️</button>
      </div>
    `).join("")
    : empty("📭", "Belum ada pesanan");

  /* PENDAPATAN */
  $("pdTotal").textContent = rp(h.pend);
  $("pdPesanan").textContent = h.jml + " pesanan";
  $("pdCup").textContent = num(h.cup);
  $("pdJml").textContent = h.jml;

  const per = {};

  DATA.pesanan.forEach(p => {
    const nama = p.cafeNama;
    const o = per[nama] || (per[nama] = {
      cup: 0,
      total: 0,
      n: 0
    });

    o.cup += Number(p.cup || 0);
    o.total += Number(p.total || 0);
    o.n++;
  });

  const namaCafe = Object.keys(per);

  $("pdCafe").innerHTML = namaCafe.length
    ? namaCafe.map(nama => `
      <div class="item">
        <div class="ic">☕</div>
        <div class="info">
          <div class="t">${esc(nama)}</div>
          <div class="s">${num(per[nama].cup)} cup • ${per[nama].n} pesanan</div>
        </div>
        <div class="v">${rp(per[nama].total)}</div>
      </div>
    `).join("")
    : empty("📊", "Belum ada data pendapatan");

  /* KASBON */
  $("ksTotal").textContent = rp(h.kasbon);

  $("listKasbon").innerHTML = DATA.kasbon.length
    ? byNew(DATA.kasbon).map(k => `
      <div class="item">
        <div class="ic">💸</div>
        <div class="info">
          <div class="t minus">- ${rp(k.jumlah)}</div>
          <div class="s">${tgl(k.waktu)}</div>
        </div>
        <button class="del" onclick="hapus('kasbon','${esc(k.id)}','🗑️','Hapus catatan kasbon ini?')">🗑️</button>
      </div>
    `).join("")
    : empty("🙌", "Belum ada kasbon");

  /* DAFTAR CAFE */
  $("listCafe").innerHTML = cafes.length
    ? cafes.map(c => `
      <div class="item">
        <div class="ic">☕</div>
        <div class="info">
          <div class="t">${esc(c.nama)}</div>
          <div class="s">Rp${num(c.tarif)} per cup</div>
        </div>
        <button class="del" onclick="hapus('cafes','${esc(c.id)}','🗑️','Hapus cafe ini dari daftar?')">🗑️</button>
      </div>
    `).join("")
    : empty("🏪", "Belum ada cafe, tambahkan di atas");

  /* GAJI */
  $("gjGaji").textContent = rp(h.gaji);
  $("gjGaji2").textContent = rp(h.gaji);
  $("gjCup").textContent = num(h.cup);
  $("gjJml").textContent = h.jml;
  $("gjPd").textContent = rp(h.pend);
  $("gjKs").textContent = "- " + rp(h.kasbon);

  /* RIWAYAT GAJI */
  const totCup = DATA.riwayat.reduce(
    (a, x) => a + Number(x.totalCup || 0), 0
  );

  $("listRiwayat").innerHTML = DATA.riwayat.length
    ? `
      <div class="big green">
        <div class="l">TOTAL SEMUA CUP DIKERJAKAN</div>
        <div class="n">${num(totCup)} Cup</div>
        <div class="l">${DATA.riwayat.length} kali gajian</div>
      </div>
    ` + byNew(DATA.riwayat).map(r => `
      <div class="hist">
        <div class="d">📅 ${tgl(r.waktu)}</div>
        <button class="del" onclick="hapus('riwayat','${esc(r.id)}','🗑️','Hapus riwayat gaji ini?')">🗑️</button>
        <div class="row"><span>🥤 Total Cup</span><span>${num(r.totalCup)} cup</span></div>
        <div class="row"><span>📦 Pesanan</span><span>${r.jumlahPesanan}</span></div>
        <div class="row"><span>💵 Pendapatan</span><span class="plus">${rp(r.pendapatan)}</span></div>
        <div class="row"><span>💸 Kasbon</span><span class="minus">- ${rp(r.kasbon)}</span></div>
        <div class="row"><b>✅ Gaji Diterima</b><b>${rp(r.gaji)}</b></div>
      </div>
    `).join("")
    : empty("📜", "Belum ada riwayat gaji");
}
