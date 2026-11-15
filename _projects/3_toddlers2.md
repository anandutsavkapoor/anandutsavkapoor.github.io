---
layout: page
title: TODDLERS 2.0
description: Extended star-forming region emission framework
importance: 3
category: ongoing
---

TODDLERS 2.0 is a major extension of the [TODDLERS](https://academic.oup.com/mnras/article/526/3/3871/7287615) framework, which models UV-to-mm emission from star-forming regions by combining 1D shell dynamics with Cloudy photoionization post-processing. New capabilities include a continuous star formation mode via temporal convolution, integration of [pySTARBURST99](https://github.com/CalumHawcroft/Starburst) for flexible IMF specification, binary stellar evolution via BPASS, stochastic stellar population sampling for low-mass clusters, and support for arbitrary cloud density profiles including modified Bonnor-Ebert spheres.

A variable-dust version of the library adds the grain abundance as an extra axis; SKIRT reads it through the `SFRNormalizedVariableDust` mode of its TODDLERS SED family, with the data in the resource pack `SKIRT9_Resources_TODDLERS_VariableDust`.

Code: [github.com/anandutsavkapoor/TODDLERS](https://github.com/anandutsavkapoor/TODDLERS)

Paper: _TODDLERS 2.0: Stellar feedback and observables across diverse initial mass functions, binary populations, and cloud environments_, [A&A 713, A227 (2026)](https://doi.org/10.1051/0004-6361/202660433) ([arXiv:2606.15184](https://arxiv.org/abs/2606.15184)).
