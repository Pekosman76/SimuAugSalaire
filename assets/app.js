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
    document.querySelectorAll('[data-site-year]').forEach((node) => {
      node.textContent = config.legalYear;
    });

    document.querySelectorAll('[data-domain-name]').forEach((node) => {
      node.textContent = config.domainName;
    });
  }

  function setupCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    const button = document.getElementById('accept-cookies');
    if (!banner || !button) return;

    document.querySelectorAll('[data-contact-email]').forEach((node) => {
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

    if (localStorage.getItem('cookieConsent') === 'true') {
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
    const results = document.getElementById('results');
    const errorNode = document.getElementById('form-error');
    const copyButton = document.getElementById('copy-result');

    function selectedMode() {
      const selected = Array.from(salaryModeInputs).find((input) => input.checked);
      return selected ? selected.value : 'monthly';
    }

    function updateSalaryHint() {
      const mode = selectedMode();
      salaryLabelHint.textContent = mode === 'yearly' ? 'Ex : 42000' : 'Ex : 2500';
    }

    function toggleCustomRate() {
      const isCustom = profileField.value === 'custom';
      customRateGroup.hidden = !isCustom;
      customRateInput.required = isCustom;
    }

    function showError(message) {
      errorNode.textContent = message;
      errorNode.hidden = false;
    }

    function clearError() {
      errorNode.textContent = '';
      errorNode.hidden = true;
    }

    function resolveNetRate(profile, customRate) {
      if (profile === 'non-cadre') return config.defaultNetRateNonCadre;
      if (profile === 'cadre') return config.defaultNetRateCadre;
      return customRate;
    }

    salaryModeInputs.forEach((input) => input.addEventListener('change', updateSalaryHint));
    profileField.addEventListener('change', toggleCustomRate);

    taxChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        taxRateInput.value = chip.dataset.taxChip;
      });
    });

    updateSalaryHint();
    toggleCustomRate();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearError();

      const mode = selectedMode();
      const grossInput = Number.parseFloat(salaryValueInput.value);
      const grossMonthly = mode === 'yearly' ? grossInput / 12 : grossInput;
      const targetNetGain = Number.parseFloat(document.getElementById('target-net').value);
      const taxRatePct = Number.parseFloat(taxRateInput.value || '0');
      const customRate = Number.parseFloat(customRateInput.value);
      const netRate = resolveNetRate(profileField.value, customRate);

      if (!Number.isFinite(grossInput) || grossInput <= 0) {
        showError('Le salaire brut actuel doit être supérieur à 0.');
        return;
      }

      if (!Number.isFinite(targetNetGain) || targetNetGain <= 0) {
        showError('L’objectif net doit être supérieur à 0.');
        return;
      }

      if (!Number.isFinite(taxRatePct) || taxRatePct < 0 || taxRatePct > 45) {
        showError('Le prélèvement à la source doit être entre 0 et 45 %.');
        return;
      }

      if (!Number.isFinite(netRate) || netRate < 0.6 || netRate > 0.9) {
        showError('Le taux net personnalisé doit être compris entre 0,60 et 0,90.');
        return;
      }

      const taxRate = taxRatePct / 100;
      const denominator = netRate * (1 - taxRate);

      if (denominator <= 0) {
        showError('Paramètres impossibles à calculer. Vérifiez vos entrées.');
        return;
      }

      const brutIncreaseMonthly = targetNetGain / denominator;
      const brutIncreaseYearly = brutIncreaseMonthly * 12;
      const percentIncrease = (brutIncreaseMonthly / grossMonthly) * 100;
      const gainNetMonthly = brutIncreaseMonthly * netRate * (1 - taxRate);
      const gainNetYearly = gainNetMonthly * 12;

      document.getElementById('res-target-net').textContent = formatEuro(targetNetGain);
      document.getElementById('res-percent').textContent = `${percentIncrease.toFixed(2)} %`;
      document.getElementById('res-brut-monthly').textContent = formatEuro(brutIncreaseMonthly);
      document.getElementById('res-brut-yearly').textContent = formatEuro(brutIncreaseYearly);
      document.getElementById('res-net-monthly').textContent = formatEuro(gainNetMonthly);
      document.getElementById('res-net-yearly').textContent = formatEuro(gainNetYearly);

      const salaryContext = mode === 'yearly'
        ? `${formatEuro(grossInput)} brut / an`
        : `${formatEuro(grossInput)} brut / mois`;

      const summary = `Pour gagner +${Math.round(targetNetGain)} € net par mois (après prélèvement à la source), je dois demander environ +${Math.round(brutIncreaseMonthly)} € brut par mois, soit +${percentIncrease.toFixed(2)} % d’augmentation (sur un brut actuel de ${salaryContext}).`;

      document.getElementById('ready-text').textContent = summary;
      copyButton.dataset.copyText = summary;
      results.hidden = false;
      results.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    copyButton.addEventListener('click', async () => {
      const text = copyButton.dataset.copyText || document.getElementById('ready-text').textContent;
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        copyButton.textContent = 'Résumé copié ✓';
        setTimeout(() => {
          copyButton.textContent = 'Copier le résumé';
        }, 1600);
      } catch (error) {
        showError('Copie automatique impossible. Copiez le texte manuellement.');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectSharedContent();
    setupCookieBanner();
    setupSimulator();
  });
})();
