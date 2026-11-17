/**
 * AppAlert — sayt bo'ylab chiroyli xabarnomalar (SweetAlert2 asosida).
 *
 * Foydalanish:
 *   AppAlert.success("Saqlandi!", "Ma'lumot bazaga yozildi.")
 *   AppAlert.error("Xatolik", "Server bilan bog'lanib bo'lmadi.")
 *   AppAlert.warning(...) / AppAlert.info(...)
 *   const ok = await AppAlert.confirm({ title: "...", text: "..." });
 *   if (!ok) return;
 *   AppAlert.loading("Tekshirilmoqda...");  AppAlert.close();
 *   AppAlert.toast("Yuklab olindi", "success");
 *
 * Agar SweetAlert2 yuklanmagan bo'lsa — oddiy alert/confirm ga tushadi.
 */
(function () {
  "use strict";

  // SweetAlert2 hozircha yuklanmagan bo'lsa ham ishlayverishi uchun
  // har chaqirishda yangidan tekshiramiz.
  function swalReady() {
    return typeof window.Swal !== "undefined" && typeof window.Swal.fire === "function";
  }

  function defaults(opts) {
    return Object.assign(
      {
        confirmButtonText: "Davom etish",
        cancelButtonText: "Bekor qilish",
        buttonsStyling: true,
      },
      opts
    );
  }

  function messageOf(opts) {
    var msg = opts.title || "";
    if (opts.text) msg += (msg ? "\n" : "") + opts.text;
    return msg || "Davom etasizmi?";
  }

  function fire(opts) {
    if (swalReady()) return window.Swal.fire(defaults(opts));
    window.alert(messageOf(opts));
    return Promise.resolve({ isConfirmed: true, value: true });
  }

  function withIcon(icon, title, text, opts) {
    return fire(Object.assign({ icon: icon, title: title, text: text }, opts || {}));
  }

  window.AppAlert = {
    fire: fire,

    success: function (title, text, opts) { return withIcon("success", title, text, opts); },
    error:   function (title, text, opts) { return withIcon("error",   title, text, opts); },
    warning: function (title, text, opts) { return withIcon("warning", title, text, opts); },
    info:    function (title, text, opts) { return withIcon("info",    title, text, opts); },

    /** Tasdiqlash oynasi → true (Ha) yoki false (Bekor). */
    confirm: function (opts) {
      opts = opts || {};
      if (swalReady()) {
        return window.Swal.fire(
          defaults(
            Object.assign(
              { icon: "question", showCancelButton: true, focusConfirm: true },
              opts
            )
          )
        ).then(function (result) {
          return !!(result && result.isConfirmed);
        });
      }
      return Promise.resolve(window.confirm(messageOf(opts)));
    },

    /** Kichik ko'rsatma (toast), avtomatik yopiladi. */
    toast: function (text, icon) {
      if (swalReady()) {
        return window.Swal.fire({
          toast: true,
          position: "top-end",
          icon: icon || "success",
          title: text,
          showConfirmButton: false,
          timer: 2600,
          timerProgressBar: true,
        });
      }
      return Promise.resolve();
    },

    /** "Ishlanmoqda..." oynasi — AppAlert.close() bilan yopiladi. */
    loading: function (title) {
      if (swalReady()) {
        return window.Swal.fire({
          title: title || "Ishlanmoqda...",
          allowOutsideClick: false,
          didOpen: function () { window.Swal.showLoading(); },
        });
      }
      return Promise.resolve();
    },

    close: function () {
      if (swalReady()) window.Swal.close();
    },
  };
})();
