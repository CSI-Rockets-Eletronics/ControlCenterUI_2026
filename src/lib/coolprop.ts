interface CoolpropModule {
  PropsSI(
    output: string,
    name1: string,
    prop1: number,
    name2: string,
    prop2: number,
    ref: string,
  ): number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const coolprop: CoolpropModule = (window as any).Module;

function psiToPascal(psi: number) {
  return psi * 6894.76;
}

function kgPerM3ToLbsPerIn3(kgPerM3: number) {
  return kgPerM3 * 3.61273e-5;
}

export function computeNitrousMass(
  totalMassLbs: number,
  vaporPressurePsi: number,
): {
  liquidMassLbs: number;
  vaporMassLbs: number;
} {
  const OX_VOLUME_IN_3 = 1326.678;

  try {
    const vaporPressureMetric = psiToPascal(vaporPressurePsi);

    const liqDensityKgPerM3 = coolprop.PropsSI(
      "D",
      "P",
      vaporPressureMetric,
      "Q",
      0,
      "NitrousOxide",
    );
    const liqDensityLbsPerIn3 = kgPerM3ToLbsPerIn3(liqDensityKgPerM3);

    const vapDensityKgMerM3 = coolprop.PropsSI(
      "D",
      "P",
      vaporPressureMetric,
      "Q",
      1,
      "NitrousOxide",
    );
    const vapDensityLbsPerIn3 = kgPerM3ToLbsPerIn3(vapDensityKgMerM3);

    const liqVolIn3 =
      (totalMassLbs - vapDensityLbsPerIn3 * OX_VOLUME_IN_3) /
      (liqDensityLbsPerIn3 - vapDensityLbsPerIn3);

    const liquidMassLbs = liqVolIn3 * liqDensityLbsPerIn3;
    const vaporMassLbs = totalMassLbs - liquidMassLbs;

    return { liquidMassLbs, vaporMassLbs };
  } catch {
    return { liquidMassLbs: NaN, vaporMassLbs: NaN };
  }
}
