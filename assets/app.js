/* global config */

(function initSite() {
  'use strict';

  const euroFormatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2
  });

  function formatEuro(value) {
    return euroFormatter.format(value);
  }

  function injectSharedContent() {
    const yearNodes = document.querySelectorAll('[data-site-year]');
    const domainNodes = document.querySelectorAll('[data-domain-name]');
    const emailNodes = document.querySelectorAll('[data-contact-email]');

    yearNodes.forEach((node) => { node.textContent = config.legalYear; });
    domainNodes.forEach((node) => { node.textContent = config.domainName; });
    emailNodes.forEach((node) => {
      node.textContent = config.contactEmail;
      if (node.tagName === 'A') {
        node.setAttribute('href', `mailto:${config.contactEmail}`);
      }
    });
  }

  function setupCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    const button = document.getElementById('accept-cookies');
    if (!banner || !button) return;

    const consent = localStorage.getItem('cookieConsent');
    if (consent === 'true') {
      banner.hidden = true;
      return;
    }

    banner.hidden = false;
    button.addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'true');
      banner.hidden = true;
    });
  }

  function setupSimulator() {
    const form = document.getElementById('simulator-form');
    if (!form) return;

    const salaryModeInputs = document.querySelectorAll('input[name="salary-mode"]');
    const salaryValueInput = document.getElementById('salary-value');
    const salaryLabelHint = document.getElementById('salary-label-hint');
    const profileField = document.getElementById('profil');
    const customRateGroup = document.getElementById('custom-rate-group');
    const customRateInput = document.getElementById('custom-net-rate');
    const taxRateInput = document.getElementById('tax-rate');
    const taxChips = document.querySelectorAll('[data-tax-chip]');
    const copyButton = document.getElementById('copy-result');
    const resultBox = document.getElementById('results');
    const formError = document.getElementById('form-error');

    function selectedSalaryMode() {
      const selected = Array.from(salaryModeInputs).find((input) => input.checked);
      return selected ? selected.value : 'monthly';
    }

    function updateSalaryHint() {
      const mode = selectedSalaryMode();
      salaryLabelHint.textContent = mode === 'yearly' ? 'Ex : 42000' : 'Ex : 3500';
    }

    function toggleCustomRate() {
      const isCustom = profileField.value === 'custom';
      customRateGroup.hidden = !isCustom;
      customRateInput.required = isCustom;
    }

    function showError(message) {
      formError.textContent = message;
      formError.hidden = false;
    }

    function clearError() {
      formError.textContent = '';
      formError.hidden = true;
    }

    function resolveNetRate(profile, customRate) {
      if (profile === 'non-cadre') return config.defaultNetRateNonCadre;
      if (profile === 'cadre') return config.defaultNetRateCadre;
      return customRate;
    }

    salaryModeInputs.forEach((input) => input.addEventListener('change', updateSalaryHint));
    profileField.addEventListener('change', toggleCustomRate);
    updateSalaryHint();
    toggleCustomRate();

    taxChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        taxRateInput.value = chip.dataset.taxChip;
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearError();

      const mode = selectedSalaryMode();
      const grossInputValue = Number.parseFloat(salaryValueInput.value);
      const brutMensuel = mode === 'yearly' ? grossInputValue / 12 : grossInputValue;
      const profile = profileField.value;
      const customRate = Number.parseFloat(customRateInput.value);
      const targetNetGain = Number.parseFloat(document.getElementById('target-net').value);
      const taxRatePct = Number.parseFloat(taxRateInput.value || '0');
      const netRate = resolveNetRate(profile, customRate);

      if (!Number.isFinite(grossInputValue) || grossInputValue <= 0) {
        showError('Le salaire brut actuel doit être supérieur à 0.');
        return;
      }
      if (!Number.isFinite(targetNetGain) || targetNetGain <= 0) {
        showError('L’objectif de gain net doit être supérieur à 0.');
        return;
      }
      if (!Number.isFinite(taxRatePct) || taxRatePct < 0 || taxRatePct > 45) {
        showError('Le taux de PAS doit être compris entre 0 et 45 %.');
        return;
      }
      if (!Number.isFinite(netRate) || netRate < 0.6 || netRate > 0.9) {
        showError('Le taux net personnalisé doit être compris entre 0,60 et 0,90.');
        return;
      }

      const taxRate = taxRatePct / 100;
      const denominator = netRate * (1 - taxRate);
      if (denominator <= 0) {
        showError('Les paramètres saisis produisent un calcul impossible.');
        return;
      }

      const brutIncreaseMonthly = targetNetGain / denominator;
      const brutIncreaseYearly = brutIncreaseMonthly * 12;
      const percentIncrease = (brutIncreaseMonthly / brutMensuel) * 100;
      const nouveauBrutMensuel = brutMensuel + brutIncreaseMonthly;
      const nouveauBrutAnnuel = nouveauBrutMensuel * 12;
      const gainNetMensuel = brutIncreaseMonthly * netRate * (1 - taxRate);
      const gainNetAnnuel = gainNetMensuel * 12;

      document.getElementById('res-percent').textContent = `${percentIncrease.toFixed(2)} %`;

      document.getElementById('res-monthly-brut-increase').textContent = formatEuro(brutIncreaseMonthly);
      document.getElementById('res-monthly-net-gain').textContent = formatEuro(gainNetMensuel);
      document.getElementById('res-monthly-new-gross').textContent = formatEuro(nouveauBrutMensuel);

      document.getElementById('res-yearly-brut-increase').textContent = formatEuro(brutIncreaseYearly);
      document.getElementById('res-yearly-net-gain').textContent = formatEuro(gainNetAnnuel);
      document.getElementById('res-yearly-new-gross').textContent = formatEuro(nouveauBrutAnnuel);

      const salaireActuelTexte = mode === 'yearly'
        ? `${formatEuro(grossInputValue)} brut/an`
        : `${formatEuro(grossInputValue)} brut/mois`;

      const summary = `Pour gagner +${formatEuro(targetNetGain)} net/mois (après impôt), je dois demander environ +${formatEuro(brutIncreaseMonthly)} brut/mois, soit +${percentIncrease.toFixed(2)} % (sur un brut actuel de ${salaireActuelTexte}).`;

      document.getElementById('ready-text').textContent = summary;
      copyButton.dataset.copyText = summary;
      resultBox.hidden = false;
    });

    copyButton.addEventListener('click', async () => {
      const text = copyButton.dataset.copyText || document.getElementById('ready-text').textContent;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        copyButton.textContent = 'Résumé copié ✓';
        setTimeout(() => {
          copyButton.textContent = 'Copier le résumé';
        }, 1800);
      } catch (error) {
        showError('Copie impossible automatiquement. Copiez le texte manuellement.');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectSharedContent();
    setupCookieBanner();
    setupSimulator();
  });
})();
