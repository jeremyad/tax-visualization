// ==================
// TAX RATES FOR 2017
// ==================

var BASE_RATES_2017 = {
  'ordinary': {
    'single': [[0, 10], [9325, 15], [37950, 25], [91900, 28], [191650, 33], [416700, 35], [418400, 39.6]],
    'hoh': [[0, 10], [13350, 15], [50800, 25], [131200, 28], [212500, 33], [416700, 35], [444550, 39.6]],
    'mfj': [[0, 10], [18650, 15], [75900, 25], [153100, 28], [233350, 33], [416700, 35], [470700, 39.6]]
  },
  'capital': {
    'single': [[0, 0], [37950, 15], [418400, 20]],
    'hoh': [[0, 0], [50800, 15], [444550, 20]],
    'mfj': [[0, 0], [75900, 15], [470700, 20]]
  }
};

var STANDARD_DEDUCTION_2017 = {
  'single': 6350,
  'hoh': 9350,
  'mfj': 12700
};

var PERSONAL_EXEMPTION_2017 = 4050;

// These are the points at which the phaseouts begin.
var EXEMPTION_PHASEOUTS_2017 = {
  'single': 261500,
  'hoh': 287650,
  'mfj': 313800
};

var OBAMACARE_SURTAX_BRACKETS = {
  'single': [[0,0], [200000, 3.8]],
  'hoh': [[0,0], [200000, 3.8]],
  'mfj': [[0,0], [250000, 3.8]]
};

// ==================
// TAX RATES FOR 2018
// ==================

var BASE_RATES_2018 = {
  'ordinary': {
    'single': [[0, 10], [9525, 12], [38700, 22], [82500, 24], [157500, 32], [200000, 35], [500000, 37]],
    'hoh': [[0, 10], [13600, 12], [51800, 22], [82500, 24], [157500, 32], [200000, 35], [500000, 37]],
    'mfj': [[0, 10], [19050, 12], [77400, 22], [165000, 24], [315000, 32], [400000, 35], [600000, 37]]
  },
  'capital': {
    'single': [[0, 0], [38600, 15], [425800, 20]],
    'hoh': [[0, 0], [51700, 15], [452400, 20]],
    'mfj': [[0, 0], [77200, 15], [479000, 20]]
  }
};

var STANDARD_DEDUCTION_2018 = {
  'single': 12000,
  'hoh': 18000,
  'mfj': 24000
};

var BASE_RATES = {
  2017: BASE_RATES_2017,
  2018: BASE_RATES_2018
}

// ===========
// PAYROLL TAX
// ===========

var PAYROLL_TAX_RATES = [[0,7.65], [127200, 1.45], [200000,2.35]]

// ========================
// EARNED INCOME TAX CREDIT
// ========================

// Keys are numbers of dependents.
var EITC_RATES_2017 = {
  0: [[0, -7.65], [6670, 0], [8340, 7.65], [15010, 0]],
  1: [[0, -34], [10000, 0], [18340, 15.98], [39617, 0]],
  2: [[0, -40], [14040, 0], [18340, 21.06], [45007, 0]],
  3: [[0, -45], [14040, 0], [18340, 21.06], [48340, 0]]
}

/**
 * Returns the EITC tax brackets for the given type of taxpayer.
 *
 * @param {string} filingStatus - The taxpayer's filing status ("mfj", "hoh",
 *   or "single").
 * @param {number} numDependents - The number of dependents.
 * @returns A list of brackets representing the EITC bracket structure.
 */
var getEitcBrackets = function(filingStatus, numDependents) {
  // No additional EITC beyond the first three dependents.
  if (numDependents > 3) {
    numDependents = 3
  }

  var result = deepCopy(EITC_RATES_2017[numDependents]);

  if (filingStatus == "mfj") {
    // Extra $5000 of plateau for married couples.
    result[2][0] += 5000;
    result[3][0] += 5000;
  }

  return result;
}


// ================
// CHILD TAX CREDIT
// ================

var CTC_AMOUNT = {
  2017: 1000,
  2018: 2000
};

var CTC_PHASE_IN_THRESHOLDS = {
  2017: 3000,
  2018: 2500
};

var CTC_PHASE_IN_RATE = 15;

var CTC_PHASE_OUT_THRESHOLDS = {
  2017: {
    'mfj': 110000,
    'single': 75000,
    'hoh': 75000
  },
  2018: {
    'mfj': 400000,
    'single': 200000,
    'hoh': 200000
  }
};

var CTC_PHASE_OUT_RATE = 5

/**
 * Returns the Child Tax Credit tax brackets for the given type of taxpayer.
 *
 * @param {number} year - The tax year at issue (2017 or 2018).
 * @param {string} filingStatus - The taxpayer's filing status ("mfj", "hoh",
 *   or "single").
 * @param {number} numDependents - The number of dependents.
 * @param {array} brackets - The basic brackets for this type of taxpayer
 *   (including the zero bracket.)
 * @returns A list of brackets representing the CTC bracket structure.
 */
var getCtcBrackets = function(year, filingStatus, numDependents, brackets) {
  if (numDependents <= 0) {
    return [[0,0]];
  }

  var maxBenefit = numDependents * CTC_AMOUNT[year];

  var phaseInThreshold = CTC_PHASE_IN_THRESHOLDS[year];
  var phaseInOver = phaseInThreshold + maxBenefit * 100.0 / CTC_PHASE_IN_RATE;

  var phaseOutThreshold = CTC_PHASE_OUT_THRESHOLDS[year][filingStatus];
  var phaseOutOver = phaseOutThreshold + maxBenefit * 100.0 / CTC_PHASE_OUT_RATE;

  // Figure out where the taxpayer owes the maximum benefit.
  var taxBeforeBracket = 0;
  var entirelyRefundedPoint = phaseInOver;
  for (var i = 0; i < brackets.length - 1; i += 1) {
    var bracketStart = brackets[i][0];
    var bracketEnd = brackets[i + 1][0];
    var bracketRate = brackets[i][1];

    if (bracketStart > phaseInOver) {
      break;
    }

    var taxInBracket = (bracketEnd - bracketStart) * bracketRate / 100.0;
    if (taxBeforeBracket + taxInBracket > maxBenefit) {
      var remainingTax = maxBenefit - taxBeforeBracket;
      entirelyRefundedPoint = (bracketStart + 
        (remainingTax / taxInBracket) * (bracketEnd - bracketStart));
      break;
    } else {
      taxBeforeBracket += taxInBracket;
    }
  }

  return [[0, 0], [phaseInThreshold, -1 * CTC_PHASE_IN_RATE], [entirelyRefundedPoint, 0],
          [phaseOutThreshold, CTC_PHASE_OUT_RATE], [phaseOutOver, 0]]
}


// ==================
// PREMIUM TAX CREDIT
// ==================

var PREMIUM_TAX_CREDIT_RATES = [
  [133, 150, 3, 4],
  [150, 200, 4, 6.3],
  [200, 250, 6.3, 8.05],
  [250, 300, 8.05, 9.5],
  [300, 400, 9.5, 9.5]
]

// Use this for 2018 too, since 2018 values have not yet been released.
var POVERTY_LINE_2017 = {
  1: 12060,
  2: 16240,
  3: 20420,
  4: 24600,
  5: 28780,
  6: 32960
}

// These values come from p. 6 of
// https://aspe.hhs.gov/system/files/pdf/258456/Landscape_Master2018_1.pdf.
var AVERAGE_PREMIUM = {
  2017: 300 * 12,
  2018: 411 * 12
};

/**
 * Returns the Premium Tax Credit tax brackets for the given type of taxpayer.
 *
 * The result also incorporates the Obamacare Medicaid expansion.
 *
 * @param {string} filingStatus - The taxpayer's filing status ("mfj", "hoh",
 *   or "single").
 * @param {number} numDependents - The number of dependents.
 * @returns A list of brackets representing the PTC bracket structure.
 */
var getPtcBrackets = function(year, filingStatus, numDependents) {
  var result = [[0,0]];

  var householdSize = numDependents + (filingStatus == "mfj" ? 2 : 1);
  var povertyLine = POVERTY_LINE_2017[householdSize];

  var totalPremium = householdSize * AVERAGE_PREMIUM[year];

  for (var i = 0; i < PREMIUM_TAX_CREDIT_RATES.length; i += 1) {
    var bracketStart = PREMIUM_TAX_CREDIT_RATES[i][0] * povertyLine / 100.0;
    var bracketEnd = PREMIUM_TAX_CREDIT_RATES[i][1] * povertyLine / 100.0;

    var contributionStart = bracketStart * PREMIUM_TAX_CREDIT_RATES[i][2] / 100.0;
    var contributionEnd = bracketEnd * PREMIUM_TAX_CREDIT_RATES[i][3] / 100.0;

    var marginalRate = 100 * (contributionEnd - contributionStart) / (bracketEnd - bracketStart);

    // Abrupt loss of Medicaid.
    if (i == 0) {
      result.push([bracketStart - 1, contributionStart * 100])
    }

    // Check if we've finished paying for insurance.
    if (contributionEnd > totalPremium) {
      bracketEnd = bracketStart + (totalPremium - contributionStart) / marginalRate;
    }

    result.push([bracketStart, marginalRate]);

    if (contributionEnd > totalPremium) {
      break;
    }
  }

  // Check for a cliff at 400% of the poverty line.
  if (contributionEnd < totalPremium) {
    result.push([bracketEnd, (totalPremium - contributionEnd) * 100]);
    bracketEnd += 1;
  }

  result.push([bracketEnd, 0]);
  return result;
}


// ===========================================
// SUPPLEMENTAL NUTRITIONAL ASSISTANCE PROGRAM
// ===========================================
//
// Note: In this section, all values are by month, not by year.

var SNAP_MAXIMUM_BENEFITS_2017 = {
  1: 194,
  2: 357,
  3: 511,
  4: 649,
  5: 771,
  6: 925
}

var SNAP_MAXIMUM_INCOMES_2017 = {
  1: 1287,
  2: 1736,
  3: 2184,
  4: 2633,
  5: 3081,
  6: 3530
}

var SNAP_STANDARD_DEDUCTIONS_2017 = {
  1: 157,
  2: 157,
  3: 157,
  4: 168,
  5: 197,
  6: 226
}

var SNAP_MAXIMUM_BENEFITS_2018 = {
  1: 192,
  2: 352,
  3: 504,
  4: 640,
  5: 760,
  6: 913
}

var SNAP_MAXIMUM_INCOMES_2018 = {
  1: 1307,
  2: 1760,
  3: 2213,
  4: 2665,
  5: 3118,
  6: 3571
}

var SNAP_STANDARD_DEDUCTIONS_2018 = {
  1: 160,
  2: 160,
  3: 160,
  4: 170,
  5: 199,
  6: 228
}

/**
 * Returns the Food Stamps quasi-tax brackets for the given type of taxpayer.
 *
 * @param {number} year - The tax year at issue (2017 or 2018).
 * @param {string} filingStatus - The taxpayer's filing status ("mfj", "hoh",
 *   or "single").
 * @param {number} numDependents - The number of dependents.
 * @returns A list of brackets representing the SNAP bracket structure.
 */
var getSnapBrackets = function(year, filingStatus, numDependents) {
  var householdSize = numDependents + (filingStatus == "mfj" ? 2 : 1);

  var standardDeduction = 0;
  if (year == 2017) {
    standardDeduction = SNAP_STANDARD_DEDUCTIONS_2017[householdSize];
  } else {
    standardDeduction = SNAP_STANDARD_DEDUCTIONS_2018[householdSize];
  }

  // Housing allowance: allowed to deduct the amount that shelter
  // exceeds half of income.
  // Income - (Shelter - 1/2 income) = 1.5 * income - shelter
  // Assuming fixed housing costs, that means that net income increases
  // as 150% of income.
  // Using CBPP's estimate of $881 for shelter, $67 for child care.
  // 
  // Net income = (Gross income * 80% - standard deduction - child care) * 1.5 - housing
  // 0 = 1.2 * gross income - 1.5 * standard deduction - 1.5 * child care - housing
  // Gross income = 1.5 * (standard deduction + child care) / 1.2 + housing / 1.2
  // Gross income = 1.25 * (standard deduction + child care) + housing / 1.2
  var contributionStart = 1.25 * (standardDeduction + 67) + 881 / 1.2;

  // Deduct an additional 20% of income, and then must contribute 30%
  // of what remains to food.
  var phaseoutRate = 30 * .8 * 1.5;

  var result = [[0, 0], [contributionStart, phaseoutRate]];

  // Point where 30% exhausts benefit.
  var maximumBenefit = 0;
  if (year == 2017) {
    maximumBenefit = SNAP_MAXIMUM_BENEFITS_2017[householdSize];
  } else {  // if (year == 2018)
    maximumBenefit = SNAP_MAXIMUM_BENEFITS_2018[householdSize];
  }
  var runOutPoint = contributionStart + maximumBenefit / (phaseoutRate / 100.0);

  var maximumIncome = 0;
  if (year == 2017) {
    maximumIncome = SNAP_MAXIMUM_INCOMES_2017[householdSize];
  } else {
    maximumIncome = SNAP_MAXIMUM_INCOMES_2018[householdSize];
  }

  if (runOutPoint <= maximumIncome) {
    result.push([runOutPoint, 0]);
  } else {
    var lostBenefit = (1 - phaseoutRate / 100) * (runOutPoint - maximumIncome);

    // Multiply by 100% and convert from monthly to annual.
    var lostBenefitMarginalRate = lostBenefit * 100 * 12;

    result.push([maximumIncome, lostBenefit * 100 * 12], [maximumIncome + 1.0 / 12, 0]);
  }

  // All SNAP statistics are monthly, so scale.
  return scaleBrackets(result, 12);
}


// ==============================
// HOUSING CHOICE VOUCHER PROGRAM
// ==============================

var MEDIAN_RENT = 949 * 12;
var MEDIAN_INCOME = 56516;
var SECTION8_DEDUCTION = 480;

/**
 * Returns the Section 8 quasi-tax brackets for the given type of taxpayer.
 *
 * @param {string} filingStatus - The taxpayer's filing status ("mfj", "hoh",
 *   or "single").
 * @param {number} numDependents - The number of dependents.
 * @returns A list of brackets representing the Section 8 bracket structure.
 */
var getSection8Brackets = function(filingStatus, numDependents) {
  var deduction = SECTION8_DEDUCTION * numDependents;
  var result = [[0,0], [deduction, 30]];
  if (deduction == 0) {
    result = [[deduction, 30]];
  }

  // Point where 30% exhausts benefit.
  var runOutPoint = deduction + MEDIAN_RENT / 0.3;

  // Point where household becomes ineligible.
  var maximumIncome = .8 * MEDIAN_INCOME;

  if (runOutPoint <= maximumIncome) {
    result.push([runOutPoint, 0]);
  } else {
    var lostBenefit = (runOutPoint - maximumIncome) * 0.7;

    result.push([maximumIncome, lostBenefit * 100], [maximumIncome + 1, 0]);
  }

  return result;
}

// =================
// UTILITY FUNCTIONS
// =================

var deepCopy = function(brackets) {
  return JSON.parse(JSON.stringify(brackets));
}

/**
 * Adds two bracket structures together.
 *
 * It produces a new list of brackets that represents the cumulative effect of
 * the two parameter bracket structures.
 *
 * @param {array} brackets1 - The first list of brackets.
 * @param {array} brackets2 - The second list of brackets.
 * @returns A new list of brackets representing the sum of `brackets1` and 
 *   `brackets2`
 */
var addBrackets = function(brackets1, brackets2) {
  var index1 = 0;
  var index2 = 0;

  result = [];

  while (index1 < brackets1.length && index2 < brackets2.length) {
    var bracket1Start = brackets1[index1][0];
    var bracket1Rate = brackets1[index1][1];
    var bracket2Start = brackets2[index2][0];
    var bracket2Rate = brackets2[index2][1];

    var sumRate = bracket1Rate + bracket2Rate;
    var sumStart = bracket1Start > bracket2Start ? bracket1Start : bracket2Start;

    result.push([sumStart, sumRate]);

    if (index1 == brackets1.length - 1 && index2 == brackets2.length - 1) {
      break;
    } else if (index1 == brackets1.length - 1) {
      index2 += 1;
    } else if (index2 == brackets2.length - 1) {
      index1 += 1;
    } else {
      var nextBracket1Start = brackets1[index1 + 1][0];
      var nextBracket2Start = brackets2[index2 + 1][0];

      if (nextBracket1Start < nextBracket2Start) {
        index1 += 1;
      } else if (nextBracket2Start < nextBracket1Start) {
        index2 += 1;
      } else { // if (nextBracket1Start == nextBracket2Start)
        index1 += 1;
        index2 += 1;
      }
    }
  }

  return result;
}

/**
 * Shifts all of the bracket thresholds by the same amount.
 *
 * It produces a new list of brackets with the new bracket thresholds,
 * adding a zero bracket at the beginning.
 *
 * @param {array} brackets - The original list of brackets.
 * @param {number} shiftAmount - The amount by which to shift the bracket
 *   thresholds.
 * @returns A new set of brackets representing the shifted bracket structure.
 */
var shiftBrackets = function(brackets, shiftAmount) {
  var result = [[0,0]];
  for (var i = 0; i < brackets.length; i += 1) {
    result.push([brackets[i][0] + shiftAmount, brackets[i][1]]);
  }
  return result;
}

/**
 * Scales all of the bracket thresholds by the same amount.
 *
 * It produces a new list of brackets with the new bracket thresholds,
 * adding a zero bracket at the beginning. Optionally scales the rates
 * by the reciprocal (to represent deductions of a percentage of income).
 *
 * @param {array} brackets - The original list of brackets.
 * @param {number} scaleFactor - The factor by which to scale the bracket
 *   thresholds.
 * @param {boolean} scaleRatesToo - If this is true, scales the rates by
 *   the reciprocal of `scaleFactor`.
 * @returns A new list of brackets representing the scaled bracket structure.
 */
var scaleBrackets = function(brackets, scaleFactor, scaleRatesToo=false) {
  var result = [];
  for (var i = 0; i < brackets.length; i += 1) {
    var newBegin = brackets[i][0] * scaleFactor;
    var newRate = brackets[i][1];

    if (scaleRatesToo) {
      newRate /= scaleFactor;
    }

    result.push([newBegin, newRate]);
  }
  return result;
}

/**
 * Applies the 2017 zero bracket (including phaseout).
 *
 * @param {array} brackets1 - The original list of brackets.
 * @param {string} filingStatus - The taxpayer's filing status.
 * @param {number} numDependents - The number of dependents.
 * @returns A new set of brackets representing the bracket structure with
 *   the standard deduction and personal exemptions.
 */
var shiftBrackets2017 = function(brackets, filingStatus, numDependents) {
  // First, apply standard deduction and exemptions.
  var numExemptions = (filingStatus == "mfj" ? 2 : 1) + numDependents;
  var totalExemption = numExemptions * PERSONAL_EXEMPTION_2017;
  var standardDeduction = STANDARD_DEDUCTION_2017[filingStatus];
  var zeroBracket = standardDeduction + totalExemption;

  brackets = shiftBrackets(brackets, zeroBracket);

  // Next, apply phase-out (approximately).
  var phaseoutBegin = EXEMPTION_PHASEOUTS_2017[filingStatus];
  var phaseoutEnd = phaseoutBegin + 125000;
  var firstBracketInPhaseout = true;
  var firstBracketOutOfPhaseout = true;

  // This is the factor by which we will adjust the tax rates in the phaseout range.
  var phaseoutRate = 1.0 + (totalExemption / 125000.0);

  var result = [];
  for (var i = 0; i < brackets.length; i += 1) {
    var bracketBegin = brackets[i][0];
    var bracketRate = brackets[i][1];

    // Not yet in phaseout range.
    if (bracketBegin < phaseoutBegin) {
      result.push([bracketBegin, bracketRate]);
      continue;
    }

    // Add a bracket beginning at start of phaseout if necessary.
    if (firstBracketInPhaseout) {
      firstBracketInPhaseout = false;

      if (bracketBegin != phaseoutBegin) {
        var lastRate = result[result.length - 1][1];
        result.push([phaseoutBegin, lastRate * phaseoutRate]);
      }
    }

    // Bracket beginning in middle of phaseout.
    if (bracketBegin < phaseoutEnd) {
      // Taxable Income = 
      //   AGI - standard deduction
      //   - total exemption * (phaseoutEnd - AGI) / 125000
      // Solve for AGI:
      var adjustedBegin = (
        (bracketBegin - totalExemption + (totalExemption * phaseoutEnd / 125000.0))
        / phaseoutRate);
      result.push([adjustedBegin, bracketRate * phaseoutRate]);

      continue;
    }

    // We're past the phaseout range.

    // Add a bracket beginning at end of phaseout if necessary.
    if (firstBracketOutOfPhaseout) {
      firstBracketOutOfPhaseout = false;

      if (bracketBegin != phaseoutEnd) {
        result.push([phaseoutEnd, brackets[i - 1][1]]);
      }
    }

    result.push([bracketBegin, bracketRate]);
  }

  return result;
}

/**
 * Makes a table for comparing multiple rate structures.
 *
 * @param {array} series - A list, each of whose elements is a list of brackets.
 * @returns A list, each of whose elements is a list consisting of a bracket
 *   start, a bracket end, and the applicable rate from each of the parameter
 *   series.
 */
var makeTable = function(series) {
  var indices = [];
  for (var i = 0; i < series.length; i += 1) {
    indices.push(0);
  }

  var done = false;
  var lastEnd = 0;

  var result = [];

  while (!done) {
    var bracketStart = lastEnd;

    var bracketEnd = Number.MAX_SAFE_INTEGER;
    var bracketEndIndices = [];
    for (var i = 0; i < indices.length; i += 1) {
      if (indices[i] < series[i].length - 1) {
        var miniBracketEnd = series[i][indices[i] + 1][0];
        if (miniBracketEnd > bracketStart && miniBracketEnd < bracketEnd) {
          bracketEnd = miniBracketEnd;
          bracketEndIndices = [i];
        } else if (miniBracketEnd == bracketEnd) {
          bracketEndIndices.push(i);
        }
      }
    }

    var row = [bracketStart, bracketEnd];
    for (var i = 0; i < indices.length; i += 1) {
      row.push(series[i][indices[i]][1]);
    }

    result.push(row);

    for (var i = 0; i < bracketEndIndices.length; i += 1) {
      indices[bracketEndIndices[i]] += 1;
    }
    lastEnd = bracketEnd;

    // Check whether we're at the end of all of them.
    if (bracketEndIndices.length == 0) {
      break;
    }

    done = true;
    for (var i = 0; i < indices.length; i += 1) {
      if (indices[i] < series[i].length) {
        done = false;
        break;
      }
    }
  }

  return result;
}

// =============
// MAIN FUNCTION
// =============

/**
 * Returns the tax brackets for the given type of taxpayer.
 *
 * @param {number} year - The tax year at issue (2017 or 2018).
 * @param {string} filingStatus - The taxpayer's filing status ("mfj", "hoh",
 *   or "single").
 * @param {number} numDependents - The number of dependents.
 * @param {string} mfjDivision - Whether married taxpayers have "equal" or
 *   "unequal" income.
 * @param {string} incomeCategory - Whether this is "wages", "business" (i.e.
 *   pass-through), or "capital" income.
 * @param {array} othersToInclue - A list of other tax provisions to include
 *   in the calculation.
 * @returns A list of brackets representing the bracket structure with
 *   the zero bracket.
 */
var calculateMarginalRates = function(year,
                                      filingStatus,
                                      numDependents,
                                      mfjDivision,
                                      incomeCategory,
                                      othersToInclude) {
  var rateClass = incomeCategory == "capital" ? "capital" : "ordinary";
  var result = deepCopy(BASE_RATES[year][rateClass][filingStatus]);

  // Anything based on taxable income goes here.

  // Apply zero bracket.
  if (year == 2017) {
    result = shiftBrackets2017(result, filingStatus, numDependents);
  } else if (year == 2018) {
    result = shiftBrackets(result, STANDARD_DEDUCTION_2018[filingStatus]);
  }

  // Anything based on AGI goes here.

  // 20% pass-through deduction in 2018
  if (year == 2018 && incomeCategory == "business") {
    result = scaleBrackets(result, 1.25, true);
  }

  if (incomeCategory != "wages") {
    result = addBrackets(result, 
                         deepCopy(OBAMACARE_SURTAX_BRACKETS[filingStatus]));
  }

  if ($.inArray("eitc", othersToInclude) != -1) {
    result = addBrackets(result, getEitcBrackets(filingStatus, numDependents));
  }

  if ($.inArray("ctc", othersToInclude) != -1) {
    var ctcBrackets = getCtcBrackets(year, filingStatus, numDependents, result);
    result = addBrackets(result, ctcBrackets);
  }

  if ($.inArray("payroll", othersToInclude) != -1) {
    if (filingStatus == "mfj" && mfjDivision == "equal") {
      result = addBrackets(result, scaleBrackets(PAYROLL_TAX_RATES, 2));
    } else {
      result = addBrackets(result, PAYROLL_TAX_RATES);
    }
  }

  if ($.inArray("ptc", othersToInclude) != -1) {
    result = addBrackets(result, getPtcBrackets(year, filingStatus, numDependents));
  }

  if ($.inArray("section8", othersToInclude) != -1) {
    result = addBrackets(result, getSection8Brackets(filingStatus, numDependents))
  }

  if ($.inArray("snap", othersToInclude) != -1) {
    result = addBrackets(result, getSnapBrackets(year, filingStatus, numDependents));
  }

  return result;
}

// =============
// DISPLAY TOOLS
// =============

/**
 * Inactivates the given button or set of buttons.
 *
 * @param {object} $input - JQuery object for a button or set of buttons.
 */
var disableButton = function($input) {
  $input.prop("checked", false);
  $input.prop("disabled", true);
  $input.parent("label").addClass("disabled");
  $input.parent("label").removeClass("active");
  $input.parent("label").prop("disabled", true);
}

/**
 * Activates the given button or set of buttons.
 *
 * @param {object} $input - JQuery object for a button or set of buttons.
 * @param {boolean} check - Whether the button should be checked.
 */
var enableButton = function($input, check=false) {
  $input.parent("label").prop("disabled", false);
  $input.prop("disabled", false);
  $input.parent("label").removeClass("disabled");
  if (check) {
    $input.parent("label").addClass("active");
    $input.prop("checked", true);
  }
  
}

/**
 * Ensures that buttons are activated/disactivated based on the state of
 *   other buttons.
 */
var enforceIncomeCategories = function() {
  var incomeCategory = $("input[name=income-category]:checked").val();

  if (incomeCategory == "wages") {
    enableButton($("input[name=others]"));
  } else if (incomeCategory == "capital") {
    disableButton($("input[name=others]"));
    enableButton($("input[value=ptc]"));
  } else {  // if (incomeCategory == "business")
    enableButton($("input[name=others]"));
    disableButton($("input[value=payroll]"));
  }

  var filingStatus = $("input[name=filing-status]:checked").val();

  if (filingStatus != "mfj") {
    disableButton($("input[value=equal]"));
    disableButton($("input[value=unequal]"));
    $(".mfj-division").hide();
  } else {
    enableButton($("input[value=equal]"));
    enableButton($("input[value=unequal]"));

    if ($("input[name=mfj-division]:checked").length == 0) {
      enableButton($("input[value=equal]"), true);
    }

    $(".mfj-division").show();
  }
}

/**
 * Calculates tax rates based on current button status.
 *
 * @returns A dictionary mapping labels to lists of brackets based on the current settings.
 */
var getCurrentData = function() {
  var year = $("input[name=year]:checked").val();

  var years = year == "compare" ? [2017, 2018] : [parseInt(year)];

  var filingStatus = $("input[name=filing-status]:checked").val();
  var numDependents = parseInt($("input[name=dependents]:checked").val());
  var mfjDivision = $("input[name=mfj-division]:checked").val();
  var incomeCategory = $("input[name=income-category]:checked").val();

  var others = [];
  $("input[name=others]:checked").each(function() {
    others.push($(this).val());
  });

  var result = {};
  for (var i = 0; i < years.length; i += 1) {
    var label = years[i];
    var brackets = calculateMarginalRates(
        years[i], filingStatus, numDependents, 
        mfjDivision, incomeCategory, others);
    result[label] = brackets;
  }

  return result;
};

var X_MAX = 700000;

var COLORS = {
  2017: "red",
  2018: "blue"
}

/**
 * Updates the graph to reflect current data.
 *
 * @param {array} data - A dictionary mapping labels to lists of brackets.
 */
var updateChart = function(data) {
  $(".canvas-container").children().remove();
  $(".canvas-container").append("<canvas id=\"myChart\" width=\"400\" height=\"400\"></canvas>");

  var datasets = [];
  for (var label in data) {
    var brackets = data[label];

    var formattedData = [];
    for (var i = 0; i < brackets.length; i += 1) {
      formattedData.push({
        x: brackets[i][0],
        y: brackets[i][1]
      })
    }
    formattedData.push({
      x: X_MAX, 
      y: brackets[brackets.length - 1][1]
    });

    var color = COLORS[label];

    datasets.push({
      label: label,
      steppedLine: true,
      fill: false,
      borderColor: color,
      backgroundColor: color,
      data: formattedData
    });
  }

  var ctx = document.getElementById("myChart").getContext('2d');
  var myChart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: datasets
      },
      options: {
        animation: {
          duration: 0
        },
        scales: {
            xAxes: [{
              scaleLabel: {
                labelString: "Adjusted Gross Income",
                display: true
              },
              type: 'linear',
              position: 'bottom',
              ticks: {
                min: 0,
                max: X_MAX
              }
            }],
            yAxes: [{
              scaleLabel: {
                labelString: 'Marginal tax rate', 
                display: true
              },
              ticks: {
                beginAtZero:true,
                min: -50,
                max: 100
              }
            }]
        }
      }
  });
};

/**
 * Formats a dollar amount  (with a dollar sign and two decimal places).
 * 
 * @param {number} amount - The dollar amount to format.
 */
var formatDollarAmount = function(amount) {
  return "$" + amount.toLocaleString("en-US", {maximumFractionDigits: 0});
}

/**
 * Updates the table to reflect current data.
 *
 * @param {array} data - A list of brackets representing the current bracket
 *   structure.
 */
var updateTable = function(data) {
  var $table = $("#myTable");
  $table.children().remove();

  var labels = Object.keys(data);
  labels.sort();

  var newrows = [];

  // Header row.
  var header = "<tr><th>Over</th><th>But &le;</th>";
  for (var i = 0; i < labels.length; i++) {
    header += "<th>" + labels[i] + " marginal rates</th>";
  }
  header += "</tr>";
  newrows.push(header);

  var series = [];
  for (var i = 0; i < labels.length; i++) {
    series.push(data[labels[i]]);
  }

  var table_data = makeTable(series);
  for (var i = 0; i < table_data.length; i++) {
    var row = [];
    row.push(formatDollarAmount(table_data[i][0]));

    // Only add the bracket end point if it isn't the integer maximum.
    if (table_data[i][1] < 10000000) {
      row.push(formatDollarAmount(table_data[i][1]));
    } else {
      row.push("");
    }

    // Add all of the rates.
    for (var j = 2; j < table_data[i].length; j += 1) {
      row.push(table_data[i][j].toFixed(2) + "%")
    }

    var rowstring = "<tr>";
    for (var j = 0; j < row.length; j += 1) {
      rowstring += "<td>" + row[j] + "</td>";
    }
    rowstring += "</tr>\n";

    newrows.push(rowstring);
  }

  $table.append(newrows.join("\n"));

};

var refresh = function() {
  enforceIncomeCategories();

  var data = getCurrentData();
  updateChart(data);
  updateTable(data);
}

var initialize = function() {
  $(".btn").on("change", refresh);
  refresh();
}
