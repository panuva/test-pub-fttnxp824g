"use strict";
(() => {
  // src/ui/form.ts
  function renderForm(root, onCompute) {
    root.innerHTML = `
    <div>
      <label>Hourly wage (\u20AC): <input id="hourlyWage" type="number" value="15" step="0.1" min="0" /></label>
      <label>Hours / month: <input id="hoursPerMonth" type="number" value="160" step="1" min="0" /></label>
      <label>Tax model:
        <select id="taxModel">
          <option value="finland">Finland (Nyky-Suomi)</option>
          <option value="flat">Flat</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      <label>Municipal tax rate (kuntavero %): <input id="municipalTaxRate" type="number" value="19" step="0.1" min="0" max="100" /></label>
      <label>Church tax (kirkollisvero %): <input id="churchTaxRate" type="number" value="0" step="0.1" min="0" max="100" /></label>
      <label>Social security rate (%): <input id="socialSecurityRate" type="number" value="7" step="0.1" min="0" max="100" /></label>
      <label>Flat tax rate (%): <input id="flatTaxRate" type="number" value="25" step="0.1" min="0" max="100" /></label>
      <div style="margin-top:8px"><button id="computeBtn">Compute</button></div>
    </div>
  `;
    const btn = root.querySelector("#computeBtn");
    btn.addEventListener("click", () => {
      const get = (id) => root.querySelector("#" + id);
      const params = {
        hourlyWage: Number(get("hourlyWage").value) || 0,
        hoursPerMonth: Number(get("hoursPerMonth").value) || 0,
        taxModel: get("taxModel").value || "finland",
        municipalTaxRate: Number(get("municipalTaxRate").value) / 100,
        churchTaxRate: Number(get("churchTaxRate").value) / 100,
        socialSecurityRate: Number(get("socialSecurityRate").value) / 100,
        flatTaxRate: Number(get("flatTaxRate").value) / 100
      };
      onCompute(params);
    });
  }

  // src/ui/results.ts
  function renderResults(root, data) {
    root.innerHTML = `
    <div>
      <div><strong>Gross monthly income:</strong> \u20AC${data.gross.toFixed(2)}</div>
      <div><strong>Effective tax rate (vero %):</strong> ${(data.taxRate * 100).toFixed(2)}%</div>
      <div><strong>Net monthly income:</strong> \u20AC${data.net.toFixed(2)}</div>
    </div>
  `;
  }

  // src/model/params.ts
  var defaultTaxParams = {
    municipalTaxRate: 0.19,
    churchTaxRate: 0,
    socialSecurityRate: 0.07,
    stateTaxBrackets: [
      { threshold: 0, rate: 0 },
      { threshold: 14700, rate: 0.06 },
      { threshold: 24e3, rate: 0.17 },
      { threshold: 44e3, rate: 0.21 },
      { threshold: 78e3, rate: 0.31 },
      { threshold: 15e4, rate: 0.35 }
    ]
  };
  function computeStateTax(annualIncome, brackets) {
    if (annualIncome <= 0)
      return 0;
    const sorted = brackets.slice().sort((a, b) => a.threshold - b.threshold);
    let tax = 0;
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const lower = current.threshold;
      const upper = next ? next.threshold : Infinity;
      if (annualIncome <= lower)
        break;
      const taxable = Math.min(annualIncome, upper) - lower;
      if (taxable > 0) {
        tax += taxable * current.rate;
      }
      if (annualIncome <= upper)
        break;
    }
    return Math.max(0, tax);
  }
  var params_default = defaultTaxParams;

  // src/model/calculator.ts
  function clamp01(v) {
    if (Number.isNaN(v) || !isFinite(v))
      return 0;
    return Math.max(0, Math.min(1, v));
  }
  function computeTaxRateForMonthlyIncome(grossMonthlyIncome, model = "flat", params = defaultTaxParams, flatFallbackRate = 0.25) {
    if (model === "flat")
      return clamp01(flatFallbackRate);
    const annualIncome = grossMonthlyIncome * 12;
    const stateTax = computeStateTax(annualIncome, params.stateTaxBrackets);
    const stateTaxFraction = annualIncome > 0 ? stateTax / annualIncome : 0;
    const taxPercent = params.municipalTaxRate + params.churchTaxRate + stateTaxFraction + params.socialSecurityRate;
    return clamp01(taxPercent);
  }
  function grossIncome(user) {
    return user.hourlyWage * user.hoursPerMonth;
  }
  var calculator_default = {
    computeTaxRateForMonthlyIncome,
    grossIncome
  };

  // src/main.ts
  var formRoot = document.getElementById("form-root");
  var resultsRoot = document.getElementById("results-root");
  renderForm(formRoot, (uiParams) => {
    const gross = uiParams.hourlyWage * uiParams.hoursPerMonth;
    let taxRate = 0;
    if (uiParams.taxModel === "flat") {
      taxRate = uiParams.flatTaxRate;
    } else if (uiParams.taxModel === "finland") {
      const taxParams = Object.assign({}, params_default, {
        municipalTaxRate: uiParams.municipalTaxRate,
        churchTaxRate: uiParams.churchTaxRate,
        socialSecurityRate: uiParams.socialSecurityRate
      });
      taxRate = calculator_default.computeTaxRateForMonthlyIncome(gross, "finland", taxParams);
    } else {
      taxRate = uiParams.flatTaxRate;
    }
    const net = gross * (1 - taxRate);
    renderResults(resultsRoot, { gross, taxRate, net });
  });
})();
//# sourceMappingURL=bundle.js.map
