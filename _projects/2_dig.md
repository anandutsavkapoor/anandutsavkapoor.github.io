---
layout: page
title: Ionized gas emission in SKIRT
description: Photoionized gas · radiative transfer · IFU mock observations
importance: 2
category: ongoing
---

I develop modules for the [SKIRT](https://skirt.ugent.be) radiative transfer code to model photoionized gas emission, including diffuse ionized gas (DIG), in post-processed galaxy simulations. The method uses a compact five-bin characterization of the ionizing radiation field (1–6 Ryd) coupled with precomputed [Cloudy](https://trac.nublado.org) lookup tables, enabling efficient generation of spatially resolved emission line maps and synthetic IFU datacubes without a full on-the-fly chemistry solver.

Code: the [`DiffuseIonizedGasMix`](https://skirt.ugent.be/skirt9/class_diffuse_ionized_gas_mix.html) module is now part of public [SKIRT9](https://github.com/SKIRT/SKIRT9).

Preprint: Kapoor et al., _Predicting ionised gas emission in 3D with SKIRT. I. Framework and validation_ (submitted to A&A; arXiv link forthcoming).
