/* global config, Chart, jspdf */

(function initSite() {
  'use strict';

  const euroFormatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2
  });

  let salaryChart;
  let evolutionChart;

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

  function setupThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme || 'light';
    document.documentElement.setAttribute('data-theme', initialTheme);

    function refreshLabel() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      toggle.textContent = isDark ? '☀️ Mode clair' : '🌙 Mode sombre';
      toggle.setAttribute('aria-pressed', String(isDark));
    }

    refreshLabel();

    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      refreshLabel();
    });
  }

  function renderCharts({ brutIncreaseMonthly, gainNetMonthly, taxRatePct }) {
    if (typeof Chart === 'undefined') return;

    const barCtx = document.getElementById('salary-chart');
    const lineCtx = document.getElementById('evolution-chart');
    if (!barCtx || !lineCtx) return;

    if (salaryChart) salaryChart.destroy();
    if (evolutionChart) evolutionChart.destroy();

    salaryChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['Augmentation brute', 'Gain net estimé'],
        datasets: [{
          label: 'Montant mensuel (€)',
          data: [brutIncreaseMonthly, gainNetMonthly],
          backgroundColor: ['#6366f1', '#14b8a6'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${formatEuro(context.raw)}`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback(value) {
                return formatEuro(value);
              }
            }
          }
        }
      }
    });

    const months = Array.from({ length: 12 }, (_, index) => `M${index + 1}`);
    const cumulativeNet = months.map((_, index) => gainNetMonthly * (index + 1));
    const cumulativeBrut = months.map((_, index) => brutIncreaseMonthly * (index + 1));

    evolutionChart = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Cumul brut',
            data: cumulativeBrut,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            tension: 0.35,
            fill: true
          },
          {
            label: `Cumul net (${taxRatePct.toFixed(1)} % PAS)`,
            data: cumulativeNet,
            borderColor: '#14b8a6',
            backgroundColor: 'rgba(20, 184, 166, 0.2)',
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${formatEuro(context.raw)}`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback(value) {
                return formatEuro(value);
              }
            }
          }
        }
      }
    });
  }

  function buildNegotiationAdvice({ percentIncrease, brutIncreaseMonthly, targetNetGain }) {
    return `Bonjour [Prénom Manager],\n\nJe souhaite discuter d’une revalorisation salariale alignée avec mes résultats récents et l’élargissement de mon périmètre.\n\nD’après ma simulation, pour atteindre +${formatEuro(targetNetGain)} net par mois, ma demande correspond à environ +${formatEuro(brutIncreaseMonthly)} brut mensuel, soit +${percentIncrease.toFixed(2)} %.\n\nJe vous propose d’échanger sur la meilleure modalité (augmentation immédiate ou plan en 2 étapes) afin de rester cohérent avec les objectifs de l’équipe.\n\nMerci pour votre retour,\n[Signature]`;
  }

  async function exportResultsToPdf() {
    const { jsPDF } = jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const title = document.querySelector('.results-title')?.textContent || 'Résultats simulateur';
    const summary = document.getElementById('ready-text')?.textContent || '';
    const advice = document.getElementById('negotiation-advice')?.textContent || '';

    doc.setFontSize(16);
    doc.text('Simulateur d’augmentation salariale', 14, 18);
    doc.setFontSize(11);
    doc.text(title, 14, 28);

    const summaryLines = doc.splitTextToSize(`Résumé : ${summary}`, 180);
    doc.text(summaryLines, 14, 38);

    const barCanvas = document.getElementById('salary-chart');
    const lineCanvas = document.getElementById('evolution-chart');

    if (barCanvas) {
      const imgBar = barCanvas.toDataURL('image/png', 1.0);
      doc.text('Graphique 1 : Brut vs Net', 14, 75);
      doc.addImage(imgBar, 'PNG', 14, 78, 85, 52);
    }

    if (lineCanvas) {
      const imgLine = lineCanvas.toDataURL('image/png', 1.0);
      doc.text('Graphique 2 : Projection 12 mois', 110, 75);
      doc.addImage(imgLine, 'PNG', 110, 78, 85, 52);
    }

    doc.text('Conseils de négociation / mail type', 14, 140);
    const adviceLines = doc.splitTextToSize(advice, 180);
    doc.text(adviceLines, 14, 147);

    doc.save('simulation-augmentation-salaire.pdf');
  }

  function setupSimulator() {
    const form = document.getElementById('simulator-form');
    const percentNetForm = document.getElementById('percent-net-form');
    const tabButtons = Array.from(document.querySelectorAll('.mode-tab'));
    const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));

    if (!form || !percentNetForm || tabButtons.length === 0 || tabPanels.length === 0) return;

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
    const adviceNode = document.getElementById('negotiation-advice');
    const exportButton = document.getElementById('export-pdf');

    const percentNetSalaryInput = document.getElementById('percent-net-salary');
    const percentNetModeInputs = document.querySelectorAll('input[name="percent-net-mode"]');
    const percentNetPctInput = document.getElementById('percent-net-pct');
    const percentNetProfileField = document.getElementById('percent-net-profile');
    const percentNetCustomGroup = document.getElementById('percent-net-custom-group');
    const percentNetCustomRate = document.getElementById('percent-net-custom-rate');
    const percentNetTax = document.getElementById('percent-net-tax');
    const percentNetError = document.getElementById('percent-net-error');
    const percentNetResults = document.getElementById('percent-net-results');
    const percentNetAnnualBlock = document.getElementById('percent-net-annual-block');

    function selectedMode() {
      const selected = Array.from(salaryModeInputs).find((input) => input.checked);
      return selected ? selected.value : 'monthly';
    }

    function selectedPercentNetMode() {
      const selected = Array.from(percentNetModeInputs).find((input) => input.checked);
      return selected ? selected.value : 'monthly';
    }

    function activateTab(tabName) {
      tabButtons.forEach((button) => {
        const isActive = button.dataset.tabTarget === tabName;
        button.setAttribute('aria-selected', String(isActive));
        button.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      tabPanels.forEach((panel) => {
        panel.hidden = panel.id !== `panel-${tabName}`;
      });
    }

    function handleTabKeyboard(event) {
      const currentIndex = tabButtons.findIndex((button) => button === document.activeElement);
      if (currentIndex === -1) return;

      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();

      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + delta + tabButtons.length) % tabButtons.length;
      const nextTab = tabButtons[nextIndex];
      activateTab(nextTab.dataset.tabTarget);
      nextTab.focus();
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

    function togglePercentNetCustomRate() {
      const isCustom = percentNetProfileField.value === 'custom';
      percentNetCustomGroup.hidden = !isCustom;
      percentNetCustomRate.required = isCustom;
    }

    function showError(message) {
      errorNode.textContent = message;
      errorNode.hidden = false;
    }

    function clearError() {
      errorNode.textContent = '';
      errorNode.hidden = true;
    }

    function showPercentNetError(message) {
      percentNetError.textContent = message;
      percentNetError.hidden = false;
    }

    function clearPercentNetError() {
      percentNetError.textContent = '';
      percentNetError.hidden = true;
    }

    function resolveNetRate(profile, customRate) {
      if (profile === 'non-cadre') return config.defaultNetRateNonCadre;
      if (profile === 'cadre') return config.defaultNetRateCadre;
      return customRate;
    }

    tabButtons.forEach((button) => {
      button.addEventListener('click', () => activateTab(button.dataset.tabTarget));
      button.addEventListener('keydown', handleTabKeyboard);
    });

    salaryModeInputs.forEach((input) => input.addEventListener('change', updateSalaryHint));
    profileField.addEventListener('change', toggleCustomRate);
    percentNetProfileField.addEventListener('change', togglePercentNetCustomRate);

    taxChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        taxRateInput.value = chip.dataset.taxChip;
      });
    });

    updateSalaryHint();
    toggleCustomRate();
    togglePercentNetCustomRate();
    activateTab('percent');

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

      const negotiationAdvice = buildNegotiationAdvice({ percentIncrease, brutIncreaseMonthly, targetNetGain });

      document.getElementById('ready-text').textContent = summary;
      adviceNode.textContent = negotiationAdvice;
      copyButton.dataset.copyText = `${summary}

${negotiationAdvice}`;

      renderCharts({ brutIncreaseMonthly, gainNetMonthly, taxRatePct });

      results.hidden = false;
      results.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    percentNetForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearPercentNetError();

      const mode = selectedPercentNetMode();
      const grossInput = Number.parseFloat(percentNetSalaryInput.value);
      const pct = Number.parseFloat(percentNetPctInput.value);
      const taxRatePct = Number.parseFloat(percentNetTax.value);
      const customRatePercent = Number.parseFloat(percentNetCustomRate.value);
      const netRate = resolveNetRate(percentNetProfileField.value, customRatePercent / 100);

      if (!Number.isFinite(grossInput) || grossInput <= 0) {
        showPercentNetError('Le salaire brut actuel doit être supérieur à 0.');
        return;
      }

      if (!Number.isFinite(pct) || pct <= 0) {
        showPercentNetError('Le pourcentage d’augmentation doit être supérieur à 0.');
        return;
      }

      if (!Number.isFinite(taxRatePct) || taxRatePct < 0 || taxRatePct > 45) {
        showPercentNetError('Le prélèvement à la source doit être entre 0 et 45 %.');
        return;
      }

      if (!Number.isFinite(netRate) || netRate < 0.6 || netRate > 0.9) {
        showPercentNetError('Le taux net personnalisé doit être compris entre 60 % et 90 %.');
        return;
      }

      const grossMonthly = mode === 'yearly' ? grossInput / 12 : grossInput;
      const newGrossMonthly = grossMonthly * (1 + (pct / 100));
      const gainGrossMonthly = newGrossMonthly - grossMonthly;

      const netBeforeOld = grossMonthly * netRate;
      const netBeforeNew = newGrossMonthly * netRate;
      const gainNetBefore = netBeforeNew - netBeforeOld;

      const pasFactor = 1 - (taxRatePct / 100);
      const netAfterOld = netBeforeOld * pasFactor;
      const netAfterNew = netBeforeNew * pasFactor;
      const gainNetAfter = netAfterNew - netAfterOld;

      document.getElementById('percent-net-applied').textContent = `${pct.toFixed(2)} %`;
      document.getElementById('percent-net-gain-real').textContent = formatEuro(gainNetAfter);
      document.getElementById('percent-net-old-gross').textContent = formatEuro(grossMonthly);
      document.getElementById('percent-net-new-gross').textContent = formatEuro(newGrossMonthly);
      document.getElementById('percent-net-gross-gain').textContent = formatEuro(gainGrossMonthly);

      document.getElementById('percent-net-old-net-before').textContent = formatEuro(netBeforeOld);
      document.getElementById('percent-net-new-net-before').textContent = formatEuro(netBeforeNew);
      document.getElementById('percent-net-gain-before').textContent = formatEuro(gainNetBefore);

      document.getElementById('percent-net-old-net-after').textContent = formatEuro(netAfterOld);
      document.getElementById('percent-net-new-net-after').textContent = formatEuro(netAfterNew);
      document.getElementById('percent-net-gain-after').textContent = formatEuro(gainNetAfter);
      document.getElementById('percent-net-gain-after-yearly').textContent = formatEuro(gainNetAfter * 12);

      if (mode === 'yearly') {
        percentNetAnnualBlock.hidden = false;
        document.getElementById('percent-net-old-gross-yearly').textContent = formatEuro(grossMonthly * 12);
        document.getElementById('percent-net-new-gross-yearly').textContent = formatEuro(newGrossMonthly * 12);
        document.getElementById('percent-net-old-net-after-yearly').textContent = formatEuro(netAfterOld * 12);
        document.getElementById('percent-net-new-net-after-yearly').textContent = formatEuro(netAfterNew * 12);
      } else {
        percentNetAnnualBlock.hidden = true;
      }

      percentNetResults.hidden = false;
      percentNetResults.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    if (exportButton) {
      exportButton.addEventListener('click', () => {
        if (typeof jspdf === 'undefined') {
          showError('Le module PDF n’est pas chargé.');
          return;
        }

        exportResultsToPdf();
      });
    }
  }


  document.addEventListener('DOMContentLoaded', () => {
    injectSharedContent();
    setupCookieBanner();
    setupThemeToggle();
    setupSimulator();
  });
})();
