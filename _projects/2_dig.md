---
layout: page
title: Ionized gas emission in SKIRT
description: Photoionized gas · radiative transfer · IFU mock observations
importance: 2
category: ongoing
---

I am implementing a module for the [SKIRT](https://skirt.ugent.be) radiative transfer code to model photoionized gas emission — including diffuse ionized gas (DIG) — in post-processed galaxy simulations. The method uses a compact five-bin characterization of the ionizing radiation field (1–6 Ryd) coupled with precomputed [Cloudy](https://trac.nublado.org) lookup tables, enabling efficient generation of spatially resolved emission line maps and synthetic IFU datacubes without a full on-the-fly chemistry solver.

*In preparation.*
