/**
 * Bubble collapse, MHD forces, and vortex particle calculations
 */

import { PHYSICAL_CONSTANTS } from './constants.js';

export function calculateBubbleCollapse(initialRadius, drivingPressure, ambientPressure, temperature) {
  const rho = 998;
  const sigma = 0.0728;
  const gamma = 1.4;
  const pressureRatio = (ambientPressure + drivingPressure) / ambientPressure;
  const compressionRatio = Math.min(100, Math.pow(pressureRatio, 1 / (3 * gamma)));
  const minRadius = initialRadius / compressionRatio;
  const maxTemperature = temperature * Math.pow(compressionRatio, 3 * (gamma - 1));
  const maxPressure = ambientPressure * Math.pow(compressionRatio, 3 * gamma);
  const collapseTime = 0.915 * initialRadius * Math.sqrt(rho / ambientPressure);
  const E0 = 1e8;
  const peakField = E0 * compressionRatio ** 2;
  return { minRadius, compressionRatio, maxTemperature, maxPressure, collapseTime, peakField };
}

export function calculateMHDForces(params) {
  const { position, velocity, cavitationPoint, compressionRatio = 1.0, bubbleRadius = 1e-6 } = params;
  const { E_CHARGE, MP } = PHYSICAL_CONSTANTS;
  const MU_0 = 4 * Math.PI * 1e-7;
  const dx = cavitationPoint[0] - position[0];
  const dy = cavitationPoint[1] - position[1];
  const dz = cavitationPoint[2] - position[2];
  const distance = Math.sqrt(dx*dx + dy*dy + dz*dz) + 1e-12;
  const dirX = dx / distance, dirY = dy / distance, dirZ = dz / distance;
  const pinchCurrent = 1.0;
  const rPerp = Math.sqrt(dx*dx + dz*dz) + 1e-12;
  const B_theta = MU_0 * pinchCurrent / (2 * Math.PI * rPerp);
  const thetaX = -dz / rPerp, thetaZ = dx / rPerp;
  const B = [B_theta * thetaX, 0, B_theta * thetaZ];
  const E0 = 1e8;
  const E_magnitude = E0 * compressionRatio * compressionRatio / (distance * 1e6 + 1);
  const E = [-E_magnitude * dirX, -E_magnitude * dirY, -E_magnitude * dirZ];
  const vCrossB = [velocity[1]*B[2]-velocity[2]*B[1], velocity[2]*B[0]-velocity[0]*B[2], velocity[0]*B[1]-velocity[1]*B[0]];
  const F_lorentz = [E_CHARGE*(E[0]+vCrossB[0]), E_CHARGE*(E[1]+vCrossB[1]), E_CHARGE*(E[2]+vCrossB[2])];
  const P_gradient = 1e10 * compressionRatio * compressionRatio / bubbleRadius;
  const V_proton = 4/3 * Math.PI * Math.pow(0.87e-15, 3);
  const F_pressure = [-V_proton*P_gradient*dirX, -V_proton*P_gradient*dirY, -V_proton*P_gradient*dirZ];
  const F_total = [F_lorentz[0]+F_pressure[0], F_lorentz[1]+F_pressure[1], F_lorentz[2]+F_pressure[2]];
  const acceleration = [F_total[0]/MP, F_total[1]/MP, F_total[2]/MP];
  return { total: F_total, lorentz: F_lorentz, pressure: F_pressure, B_field: B, E_field: E, acceleration, distance_to_cavitation: distance };
}

export function updateVortexParticles(params) {
  const { particles, dt, phase, compressionRatio = 1.0, cavitationPoint = [0, 0, 0], bubbleRadius = 1e-6 } = params;
  const isCollapsing = phase === 'COLLAPSE' || phase === 'MINIMUM';
  const isRebounding = phase === 'REBOUND';

  const updatedParticles = particles.map(particle => {
    const pos = particle.position;
    const vel = particle.velocity;
    const vort = particle.vorticity || [0, 0, 0];
    const forces = calculateMHDForces({ position: pos, velocity: vel, cavitationPoint, compressionRatio, bubbleRadius });
    const newVel = [vel[0]+forces.acceleration[0]*dt, vel[1]+forces.acceleration[1]*dt, vel[2]+forces.acceleration[2]*dt];
    const damping = isCollapsing ? 0.95 : 0.98;
    newVel[0] *= damping; newVel[1] *= damping; newVel[2] *= damping;
    if (isCollapsing) {
      const dx = cavitationPoint[0] - pos[0];
      const dz = cavitationPoint[2] - pos[2];
      const rPerp = Math.sqrt(dx*dx + dz*dz) + 0.01;
      const spiralStrength = 0.01 * compressionRatio / rPerp;
      newVel[0] += (-dz / rPerp) * spiralStrength;
      newVel[2] += (dx / rPerp) * spiralStrength;
    }
    const newPos = [pos[0]+newVel[0]*dt, pos[1]+newVel[1]*dt, pos[2]+newVel[2]*dt];
    let vorticityMagnitude = Math.sqrt(vort[0]*vort[0]+vort[1]*vort[1]+vort[2]*vort[2]);
    if (isCollapsing) vorticityMagnitude *= (1 + 0.1 * compressionRatio * dt);
    else vorticityMagnitude *= 0.99;
    const ndx = cavitationPoint[0] - newPos[0];
    const ndz = cavitationPoint[2] - newPos[2];
    const nrPerp = Math.sqrt(ndx*ndx + ndz*ndz) + 0.01;
    const newVort = [(-ndz/nrPerp)*vorticityMagnitude, 0, (ndx/nrPerp)*vorticityMagnitude];
    let state = 'dispersed';
    if (isCollapsing) state = forces.distance_to_cavitation < 0.5 ? 'confined' : forces.distance_to_cavitation < 2 ? 'spiral' : 'converging';
    else if (isRebounding) state = 'reexpanding';
    return { position: newPos, velocity: newVel, vorticity: newVort, state, distance_to_cavitation: forces.distance_to_cavitation };
  });

  const stateCounts = { dispersed: 0, converging: 0, spiral: 0, confined: 0, reexpanding: 0 };
  let totalVorticity = 0, avgDistance = 0;
  updatedParticles.forEach(p => {
    stateCounts[p.state] = (stateCounts[p.state] || 0) + 1;
    totalVorticity += Math.sqrt(p.vorticity[0]**2 + p.vorticity[1]**2 + p.vorticity[2]**2);
    avgDistance += p.distance_to_cavitation;
  });
  avgDistance /= updatedParticles.length;
  return { particles: updatedParticles, statistics: { stateCounts, totalVorticity, avgVorticity: totalVorticity/updatedParticles.length, avgDistance } };
}

export function integrateProtonForces(params) {
  const { particles, dt, cavitationPoint, compressionRatio, bubbleRadius } = params;
  return particles.map(particle => {
    const pos = particle.position.slice();
    const vel = particle.velocity.slice();
    const forces1 = calculateMHDForces({ position: pos, velocity: vel, cavitationPoint, compressionRatio, bubbleRadius });
    const halfVel = vel.map((v, i) => v + 0.5 * forces1.acceleration[i] * dt);
    const newPos = pos.map((p, i) => p + halfVel[i] * dt);
    const forces2 = calculateMHDForces({ position: newPos, velocity: halfVel, cavitationPoint, compressionRatio, bubbleRadius });
    const newVel = halfVel.map((v, i) => v + 0.5 * forces2.acceleration[i] * dt);
    return { position: newPos, velocity: newVel, forces: forces2 };
  });
}
