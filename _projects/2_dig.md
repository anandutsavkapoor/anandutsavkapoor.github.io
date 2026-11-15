---
layout: page
title: Ionized gas emission in SKIRT
description: Photoionized gas · radiative transfer · IFU mock observations
importance: 2
category: ongoing
---

I develop modules for the [SKIRT](https://skirt.ugent.be) radiative transfer code to model photoionized gas emission, including diffuse ionized gas (DIG), in post-processed galaxy simulations. The method uses a compact five-bin characterization of the ionizing radiation field (1–6 Ryd) coupled with precomputed [Cloudy](https://trac.nublado.org) lookup tables, while an inline solver computes the ionization balance and line emissivities in each cell. This produces spatially resolved emission line maps and synthetic IFU datacubes.

Code: the [`DiffuseIonizedGasMix`](https://skirt.ugent.be/skirt9/class_diffuse_ionized_gas_mix.html) module is now part of public [SKIRT9](https://github.com/SKIRT/SKIRT9).

Paper: _Predicting ionized gas emission in 3D with SKIRT: I. Framework and validation_, [A&A 713, A279 (2026)](https://doi.org/10.1051/0004-6361/202660114) ([arXiv:2607.09961](https://arxiv.org/abs/2607.09961)).
