---
layout: page
title: background simulations
permalink: /background/
description: The physics behind the website's background animations.
nav: true
nav_order: 4
---

The background animations on this website are small physics simulations I wrote to give the pages some life. There are two of them: one for the home page and one for every other page. This page describes how they work.

If you find them distracting (a reasonable position), there is a "Pause Simulation" button in the bottom-right corner of every non-home page. The home page photons are unfortunately committed to their random walk and cannot be stopped.

---

## Home page: Monte Carlo photon random walk

The home page background traces the paths of photons diffusing through a scattering medium. The underlying method is Monte Carlo radiative transfer in its simplest form, the same class of algorithm used in production codes like [SKIRT](https://skirt.ugent.be) to model light propagating through dust in galaxies.

Four photons propagate simultaneously. Each travels a free path drawn from an exponential distribution,

$$l = -\ln(\xi) \times 60 \; \text{px},$$

where $$\xi \in (0, 1)$$ is a uniform random number. This is the standard Monte Carlo inversion of the Beer--Lambert law: the probability of a photon surviving to distance $$l$$ without scattering falls as $$e^{-l/\lambda}$$, and inverting the cumulative distribution function gives the sampling formula above. After each free path, the photon scatters isotropically into a fresh random direction. There is no absorption and no frequency shift, so this is purely elastic, isotropic scattering.

The trails fade with time using destination-out compositing (opacity reduction of 0.04 per frame). This means the screen retains the recent history of each path rather than just the instantaneous position. Scattering events are marked with small dots. When a photon ages out, it is reborn at a random position with a new colour drawn from a theme-aware palette.

---

## Non-home pages: gravitational N-body simulation

Every other page runs a gravitational simulation. On each page load, the code picks one of two modes at random (50/50).

### Pairwise softened gravity

Both modes share the same force law. Every pair of particles interacts via softened Newtonian gravity,

$$\mathbf{F}_{ij} = G \frac{m_i m_j}{\lvert\mathbf{r}_{ij}\rvert^2 + \varepsilon^2} \, \hat{r}_{ij},$$

where $$\varepsilon \approx 12\text{--}19 \; \text{px}$$ is a softening length that prevents the force from diverging at close separations. The simulation runs in a periodic box with minimum-image convention: particles that leave one edge re-enter from the opposite side, and the force loop always uses the nearest periodic image of each neighbour. The centre-of-mass velocity is subtracted every frame to keep the whole system on screen.

### Mode A: Toomre & Toomre galaxy flyby

This mode is inspired by the setup of [Toomre & Toomre (1972)](https://ui.adsabs.harvard.edu/abs/1972ApJ...178..623T): two disk galaxies on a parabolic encounter (total orbital energy exactly zero).

Each galaxy consists of a massive central nucleus surrounded by concentric rings of test particles. The ring particles start on circular Keplerian orbits around their nucleus and carry no self-gravity against one another; only the nuclei attract them. As the companion swings past the primary on its parabolic trajectory, the tidal force stretches the outer rings of the primary into long tidal arms. The companion's own disk is distorted in turn.

The primary uses a cyan colour palette; the companion uses purple. The nuclei are rendered slightly larger than the ring particles to make them easy to track.

### Mode B: damped N-body with seeding

This mode begins from a uniform random scattering of 800 particles across the viewport. Each particle is given a sub-Keplerian tangential velocity (as if orbiting the total system mass at that radius, but somewhat slower than circular speed). The system is not in equilibrium and begins collapsing and fragmenting under self-gravity.

To produce interesting long-lived structure, the simulation alternates between phases of free Newtonian gravity (7--10 s) and brief dissipative episodes (1--2 s) during which a damping term bleeds kinetic energy. This mimics the behaviour of a gas-rich system where dissipation competes with gravitational heating.

When a collapse event is detected and quenched (see below), the densest particle gains mass by absorbing a small fraction from each of its 16 nearest neighbours. The seed roughly doubles its mass per event. After roughly seven events it reaches approximately 100 times its starting mass. Mass and momentum are exactly conserved in every transfer: the seed's new velocity is computed from the total momentum of the absorbed mass, so no net momentum is injected. Particles that grow beyond 1.5 times their initial mass are rendered as triangles; the rest remain as squares. Triangle size scales with mass as $$m^{1/3}$$ (as expected for fixed density), capped to avoid excessively large symbols.

---

## Collapse feedback

The intermittent damping continuously bleeds kinetic energy; without a counteracting mechanism the system would eventually collapse into a single point. To keep the simulation alive, a feedback mechanism fires whenever the structure becomes too concentrated.

Each frame, the code locates the density centre of the system (the mass-weighted centroid of the densest local cluster, found by counting neighbours within a search radius for each particle). It then measures the 90th-percentile radius of all particles relative to that centre. If this falls below a threshold (8--16 per cent of the shorter viewport dimension), a feedback kick is triggered, subject to a 6--8 s cooldown between events.

Rather than kicking all particles equally, the kick strength follows an exponential profile peaked at the density centre:

$$\Delta v_i \propto e^{-r_i / \lambda},$$

where $$r_i$$ is each particle's distance from the density centre and $$\lambda \approx 3\text{--}10 \; \text{px}$$. Particles far from the centre receive negligible kicks. The effective kick radius is capped at the 90th-percentile distance from the density centre, so stray outliers are never artificially accelerated. A concentration amplifier (up to $$6\times$$) and a velocity factor that suppresses kicks on already fast-moving particles further shape the profile. Momentum is conserved within the kicked cluster: the net momentum injected by the kicks is subtracted uniformly from all kicked particles, so the cluster's centre of mass does not drift.

After three consecutive feedback kicks, the simulation applies extended damping to drain kinetic energy and allow the system to settle into a more stable configuration.

---

## Adaptive zoom

Once the simulation reaches a statistically stationary state, the viewport zooms in to make the structure easier to see.

Stationarity is measured using two exponential moving averages of the kinetic energy on well-separated timescales ($$\tau \approx 5.5 \; \text{s}$$ and $$\tau \approx 17 \; \text{s}$$). When the ratio of the fast average to the slow average lies within 15 per cent of unity, the system is in equilibrium and the zoom engages. If that ratio exceeds 1.15 for more than two seconds continuously (signalling sustained heating, not just a brief kick), the zoom pulls back to the full viewport. Damping does not trigger a zoom-out: a contracting system holds the current zoom level, since it is still structured.

The zoom target is set so the structure fills roughly 35 per cent of the shorter viewport dimension. The zoom is applied in JavaScript at render time rather than via CSS transforms, so particle sizes remain unaffected.

Zoom tracking only begins after three feedback events have fired. Before that, the simulation runs at full viewport scale with no tracking, to avoid the display drifting around while the system is still settling.
