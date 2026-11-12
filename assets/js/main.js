/* ──────────────────────────────────────────────────────────────────────────
   واحة — الجافاسكربت.

   **والموقع يعمل بلا هذا الملفّ.** القائمة تظهر كاملةً على الشاشات
   الكبيرة بـCSS وحده، والنموذج يُرسل بتحقّق المتصفّح الأصيل
   (`required` و`type="email"`). وما هنا تحسينٌ فوق ذلك لا شرطٌ له —
   وهذا ما يُسمّى «التحسين التدريجي»، ويعني أن تعطُّل سطرٍ هنا لا يُسقط
   الموقع.

   الوثائق: .antigravity/ARCHITECTURE.md
   ────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ── ١. القائمة على الهاتف ───────────────────────────────────────────── */

  const toggle = document.querySelector('.nav__toggle');
  const list = document.querySelector('.nav__list');

  if (toggle && list) {
    toggle.addEventListener('click', function () {
      const open = list.classList.toggle('is-open');
      /* `aria-expanded` لا الصنفُ وحده: الصنف يقوله للعين، والسمة تقوله
         لقارئ الشاشة — فيعرف أنّ الزرّ فتح شيئاً وأنّه مفتوحٌ الآن. */
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '✕' : '☰';
    });

    /* الضغط على رابطٍ يُغلق القائمة: الصفحة تتغيّر، وقائمةٌ مفتوحة فوق
       الصفحة الجديدة تُقرأ عطلاً. */
    list.addEventListener('click', function (e) {
      if (e.target.closest('.nav__link')) {
        list.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
      }
    });

    /* و`Escape` يُغلقها: من فتحها بالخطأ يخرج بلا أن يبحث عن الزرّ. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && list.classList.contains('is-open')) {
        list.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
        toggle.focus();
      }
    });
  }

  /* ── ٢. تحقّق النموذج ────────────────────────────────────────────────────

     **ولا خادم في المشروع.** النموذج يتحقّق ويعرض رسالة نجاح، ولا يُرسل
     إلى أحد — وذلك مكتوبٌ في ARCHITECTURE.md §"الدين المعروف" لا مخفيّ.
     والملفّ يطلب «نموذجاً يضمّ صندوق نصّ ومربّعات اختيار»، لا بنيةً خلفية.

     والتحقّق هنا **فوق** تحقّق المتصفّح لا بدلاً منه: `required` و
     `type="email"` في HTML تعمل بلا جافاسكربت. وما يُضاف: رسائلُ عربية
     في مكان الحقل، بدل فقاعة المتصفّح الإنجليزية. */

  const form = document.querySelector('#contact-form');

  if (form) {
    const success = document.querySelector('#form-success');

    /** يعرض خطأً تحت الحقل، ويُعلّمه لقارئ الشاشة. */
    function showError(field, message) {
      const box = document.querySelector('#error-' + field.id);
      if (box) box.textContent = message;
      field.setAttribute('aria-invalid', 'true');
    }

    function clearError(field) {
      const box = document.querySelector('#error-' + field.id);
      if (box) box.textContent = '';
      field.removeAttribute('aria-invalid');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      /* رسالةُ النجاح تُخفى عند كلّ محاولةٍ جديدة.

         **وبلا هذا تبقى ظاهرةً بعد إرسالٍ ناجح**، فمن يملأ النموذج
         مرّةً ثانية ويُخطئ يرى «وصلتنا رسالتك» فوق رسائل الخطأ معاً —
         فيظنّ أنّها وصلت وهي لم تُرسَل. */
      if (success) success.classList.remove('is-shown');

      let ok = true;
      let firstBad = null;

      /* الاسم */
      const name = form.querySelector('#name');
      clearError(name);
      if (name.value.trim().length < 2) {
        showError(name, 'اكتب اسمك — حرفان على الأقلّ.');
        ok = false;
        firstBad = firstBad || name;
      }

      /* البريد — والنمط هو نمط `type="email"` نفسه لا أوسع منه:
         فحصٌ في الواجهة أضيق من فحص المتصفّح يرفض بريداً صالحاً. */
      const email = form.querySelector('#email');
      clearError(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        showError(email, 'اكتب بريداً إلكترونياً صالحاً، مثل: name@example.com');
        ok = false;
        firstBad = firstBad || email;
      }

      /* الرسالة */
      const message = form.querySelector('#message');
      clearError(message);
      if (message.value.trim().length < 10) {
        showError(message, 'اكتب رسالتك — عشرة أحرف على الأقلّ.');
        ok = false;
        firstBad = firstBad || message;
      }

      /* مربّعات الاختيار: واحدٌ على الأقلّ.
         وهذا فحصٌ لا يفعله المتصفّح أصلاً — لا سمة `required` تعمل على
         مجموعة checkboxes، فهو السبب الحقيقي لوجود هذه الدالّة. */
      const checked = form.querySelectorAll('input[name="interest"]:checked');
      const checksError = document.querySelector('#error-interest');
      if (checksError) checksError.textContent = '';
      if (checked.length === 0) {
        if (checksError) checksError.textContent = 'اختر سبباً واحداً على الأقلّ.';
        ok = false;
        firstBad = firstBad || form.querySelector('input[name="interest"]');
      }

      if (!ok) {
        /* التركيز على أوّل خطأ: من أخطأ في حقلٍ بعيدٍ أسفل الصفحة لا
           يُترك يبحث عمّا رُفض. */
        if (firstBad) firstBad.focus();
        return;
      }

      /* نجح */
      form.reset();
      if (success) {
        success.classList.add('is-shown');
        success.focus();
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    /* ومسحُ الخطأ عند الكتابة: من يُصحّح يجب أن يرى الخطأ يزول، لا أن
       ينتظر إرسالاً ثانياً ليعرف أنّه أصاب. */
    form.addEventListener('input', function (e) {
      if (e.target.matches('.input, .textarea')) clearError(e.target);
      if (e.target.matches('input[name="interest"]')) {
        const box = document.querySelector('#error-interest');
        if (box) box.textContent = '';
      }
    });
  }

  /* ── ٣. سنة التذييل ─────────────────────────────────────────────────────
     تُكتب مرّةً هنا بدل خمس مرّاتٍ في خمسة ملفّات تتباعد. */

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
