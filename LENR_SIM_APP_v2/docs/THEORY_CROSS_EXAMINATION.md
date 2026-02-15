# Theory Cross-Examination Framework

**Version**: 0.3.2-beta  
**Last Updated**: 2026-02-14

---

## Overview

The Cross-Examination Framework validates all 19 LENR theory modules against established experimental observations. Each theory is subjected to 7 standardised checks, producing a pass/fail result with a confidence score.

This framework enables:
- Systematic comparison of competing theories
- Identification of theories consistent with the full LENR phenomenology
- Detection of predictions that contradict experimental evidence
- Ranking theories by experimental agreement

---

## Validation Checks

### 1. Miles Heat-Helium Correlation

**Check ID**: `miles_correlation`

**Criterion**: Does the theory predict He-4 production rates consistent with 1W excess heat ≈ 2.6×10^11 He-4/s (23.8 MeV per fusion event)?

**Pass condition**: Predicted He-4 rate within 1 order of magnitude of expected value, OR theory predicts He-4 as a product.

**Reference**: Miles M.H. et al. (1993) J. Electroanal. Chem. 346, 99.

### 2. No Dangerous Radiation

**Check ID**: `no_radiation`

**Criterion**: Does the theory predict neutron and gamma emissions below detection thresholds?

**Pass condition**: `product_neutrons < 0.05` AND `product_gamma < 0.1`

**Reference**: Key LENR signature — energetic radiation is not observed at levels expected from conventional nuclear reactions.

### 3. Loading Threshold (Pd-D)

**Check ID**: `loading_threshold`

**Criterion**: Does the theory correctly predict minimal activity below D/Pd ≈ 0.85, and significant activity above?

**Pass condition**:
- Below 0.85: enhancement < 10 (correctly dormant)
- Above 0.85: enhancement > 1.0 and theory is applicable

**Reference**: Fleischmann-Pons (1989); McKubre (1998).

### 4. Surface Area Dependence

**Check ID**: `surface_dependence`

**Criterion**: Does the theory predict that excess heat scales with material surface area rather than volume?

**Pass condition**: Theory includes explicit surface-related observables or parameters.

**Reference**: Storms (2007, 2014) — NAE model; Piantelli (2012).

### 5. Product Spectrum

**Check ID**: `product_spectrum`

**Criterion**: Is He-4 the primary product with minimal neutrons? (For transmutation theories, specific transmutation products are accepted.)

**Pass condition**: `product_He4 > 0.5` AND `product_neutrons < 0.1`, OR `product_transmutation > 0.3`.

### 6. Thermal Activation (Ni-H)

**Check ID**: `thermal_activation`

**Criterion**: For Ni-H theories, does the model show correct thermal onset above 400-700K?

**Pass condition**: Above threshold: `threshold_factor > 0.5`. Below: `threshold_factor < 0.3`.

**Reference**: Focardi & Piantelli (1998); CLEAN-HME project.

### 7. Reproducibility Window

**Check ID**: `reproducibility`

**Criterion**: Does the theory's confidence score suggest a parameter window that experimenters can access?

**Pass condition**: Confidence > 0.3.

---

## Scoring Summary

The overall pass rate is computed as:

```
pass_rate = n_passed / n_total_checks
```

Theories are ranked by pass rate, with ties broken by average check scores.

---

## API Endpoints

- `GET /api/analytics/validation-report?temperature=300&loading_ratio=0.9`
  Returns the full validation report for all 19 theories.

- `POST /api/analytics/theory-scores`
  Returns predictive probability scores (which incorporate validation results).

---

## Mapping to Whiteboard Open Questions

| Whiteboard Question | Relevant Check(s) | Theories Tested |
|---|---|---|
| How is Coulomb barrier bypassed? | All checks | All 19 |
| Why He-4, not He-3? No gamma? | Miles correlation, Product spectrum, No radiation | Takahashi, Hagelstein, Storms, Chubb |
| What is the slow interaction? | Parameter sensitivity | Storms (Hydroton), Hagelstein |
| Precise NAE structure? | Surface dependence | Storms (NAE), Iwamura, Piantelli |
| 1W = 2.6e11 He-4/s? | Miles correlation | Miles, all heat predictors |
| What controls reproducibility? | Reproducibility, Loading threshold | Swartz OOP, NAE |
| Scaling to practical power? | Surface dependence | Piantelli, NAE, Swartz |
| Role of the electron? | No radiation, Product spectrum | Storms, Widom-Larsen, Chubb |
| Biological transmutation? | Thermal activation, Product spectrum | Vysotskii CCS |
| Thermal activation threshold? | Thermal activation | Piantelli, CLEAN-HME |

---

## References

1. Miles M.H. et al. (1993) "Correlation of excess power and helium production". J. Electroanal. Chem. 346, 99.
2. Storms E. (2007) "The Science of Low Energy Nuclear Reaction". World Scientific.
3. Storms E. (2014) "The Explanation of Low Energy Nuclear Reaction". Infinite Energy Press.
4. Fleischmann M. & Pons S. (1989) "Electrochemically Induced Nuclear Fusion". J. Electroanal. Chem. 261, 301.
5. McKubre M.C.H. (1998) "Review of experimental measurements". Proc. ICCF-7.
6. Focardi S. & Piantelli F. (1998) "Anomalous heat in Ni-H systems". Nuovo Cimento A 111, 1233.
7. Iwamura Y. et al. (2002) "Elemental Analysis of Pd Complexes". Jpn. J. Appl. Phys. 41, 4642.
