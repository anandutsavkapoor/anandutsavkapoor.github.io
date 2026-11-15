---
layout: page
title: resources
permalink: /resources/
description: Public data releases associated with my research.
nav: true
nav_order: 6
---

This page links to public data portals associated with my published work.

---

### TODDLERS

[toddlers.ugent.be](https://toddlers.ugent.be) · [github.com/anandutsavkapoor/TODDLERS](https://github.com/anandutsavkapoor/TODDLERS)

TODDLERS (Time evolution of Observables including Dust Diagnostics and Line Emission from Regions containing young Stars) is a library of spectral energy distributions and other observables for star-forming regions. It couples a semi-analytic model of the shell dynamics around young star clusters with photoionization calculations in [Cloudy](https://trac.nublado.org), and the library is built for use in the radiative transfer code [SKIRT](https://skirt.ugent.be). The data are distributed as SciPy interpolator objects for direct use in Python. The library is described in [Kapoor et al. (2023)](https://academic.oup.com/mnras/article/526/3/3871/7287615), with the extended framework (covering arbitrary IMFs, binary populations, stochastic sampling, and non-uniform cloud profiles) presented in [Kapoor et al. (2026)](https://doi.org/10.1051/0004-6361/202660433). The accompanying open-source Python package is available on GitHub. A variable-dust version of the library, with the grain abundance as an extra axis, is available in SKIRT as the resource pack `SKIRT9_Resources_TODDLERS_VariableDust`.

---

### Ionized gas emission in SKIRT

[DiffuseIonizedGasMix documentation](https://skirt.ugent.be/skirt9/class_diffuse_ionized_gas_mix.html) · [github.com/SKIRT/SKIRT9](https://github.com/SKIRT/SKIRT9)

The `DiffuseIonizedGasMix` module in public [SKIRT9](https://github.com/SKIRT/SKIRT9) predicts emission lines from photoionized gas, including diffuse ionized gas, in post-processed galaxy simulations. It characterizes the local ionizing radiation field in five bins between 1 and 6 Ryd and reads the gas temperature and opacity from precomputed [Cloudy](https://trac.nublado.org) tables. An inline solver then computes the ion fractions and line emissivities in each cell, which yields spatially resolved line maps and synthetic IFU datacubes. The method and its validation are described in [Kapoor et al. (2026)](https://doi.org/10.1051/0004-6361/202660114).

---

### SKIRT-Auriga synthetic observations

[auriga.ugent.be](https://auriga.ugent.be)

This portal hosts synthetic multi-wavelength images and broadband photometry for Milky Way-type galaxies from the Auriga simulation suite, produced with [SKIRT](https://skirt.ugent.be). Images span ultraviolet to submillimetre wavelengths and are available for multiple viewing angles. The data release is described in [Kapoor et al. (2021)](https://arxiv.org/abs/2107.06595).
