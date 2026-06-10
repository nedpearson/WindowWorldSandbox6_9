export interface InstallAdvisorInput {
  exteriorSurface?: string;
  existingInstallStyle?: string;
  removalDifficulty?: string;
  homeownerFinishPreference?: string;
}

export interface InstallAdvisorOutput {
  recommendedMethod: string;
  costEffectiveMethod: string;
  premiumFinishMethod: string;
  laborFlags: string[];
  talkingPoints: string[];
}

export class InstallMethodAdvisorService {
  static advise(input: InstallAdvisorInput): InstallAdvisorOutput {
    let recommended = 'Standard Pocket Replacement';
    let costEffective = 'Standard Pocket Replacement';
    let premium = 'Full Frame Replacement with Custom Capping';
    const laborFlags: string[] = [];
    const talkingPoints: string[] = [];

    const surface = (input.exteriorSurface || '').toLowerCase();
    const style = (input.existingInstallStyle || '').toLowerCase();
    const finish = (input.homeownerFinishPreference || '').toLowerCase();

    // Exterior Surface Logic
    if (surface.includes('brick')) {
      recommended = 'Pocket Replacement (Preserve Brick)';
      costEffective = 'Pocket Replacement (Preserve Brick)';
      talkingPoints.push('Pocket replacement is often most cost-effective and preserves the brick opening.');
      talkingPoints.push('Check the sill and caulk line during final measure.');
      if (finish.includes('premium')) {
        premium = 'Custom exterior capping and premium caulking';
      }
    } else if (surface.includes('stucco')) {
      recommended = 'Retrofit / Pocket Replacement';
      costEffective = 'Retrofit / Pocket Replacement';
      laborFlags.push('Stucco Disturbance Risk');
      talkingPoints.push('Avoid unnecessary stucco disturbance to save on repair costs.');
      talkingPoints.push('Discuss visible finish and patching risks with the homeowner.');
    } else if (surface.includes('vinyl')) {
      recommended = 'New Construction / Nail Fin with J-Channel';
      costEffective = 'Pocket Replacement';
      talkingPoints.push('Check J-channel and siding trim for reuse vs replacement.');
      talkingPoints.push('Exterior capping can greatly improve the finished look.');
    }

    // Existing Style Logic
    if (style.includes('wood rot') || style.includes('rot')) {
      laborFlags.push('Wood Rot Repair Required');
      recommended = 'Full Frame Replacement (Repair Rot)';
      costEffective = 'Pocket (if sill is solid enough) - Not Recommended';
      talkingPoints.push('Wood rot must be addressed before new windows go in.');
    }

    if (style.includes('mulled')) {
      laborFlags.push('Mulled Unit / Mullion Labor');
      talkingPoints.push('Determine if the mullion is structural or non-structural.');
    }

    // Finish Preference Overrides
    if (finish.includes('cleanest') || finish.includes('premium')) {
      recommended = premium;
    } else if (finish.includes('lowest cost')) {
      recommended = costEffective;
    }

    return {
      recommendedMethod: recommended,
      costEffectiveMethod: costEffective,
      premiumFinishMethod: premium,
      laborFlags,
      talkingPoints
    };
  }
}
