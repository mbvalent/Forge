export interface ExerciseTips {
  targetMuscle: string
  cues: string[]
  mistakes: string[]
  tip?: string
}

const TIPS: Record<string, ExerciseTips> = {
  'assisted pull-ups': {
    targetMuscle: 'Lats, Biceps, Rear Delts',
    cues: [
      'Initiate each rep by DEPRESSING your scapulae — pull shoulder blades DOWN, not up',
      'Think "pull elbows toward back pockets," not "pull body up" — isolates lats over biceps',
      'Full hang at the bottom (full stretch), chin above the bar at the top',
      'Control the descent for 2–3 seconds',
    ],
    mistakes: [
      'Shrugging shoulders up at the top instead of pulling them down',
      'Partial range of motion — go all the way down every rep',
    ],
  },
  'lat pulldown': {
    targetMuscle: 'Lats',
    cues: [
      'Lean back ~10–15°, not upright and not 45°',
      'Pull bar to UPPER CHEST, not chin',
      'Hold the bottom for 1 second — the peak contraction most people skip',
      'Pull elbows down and back toward your hips',
    ],
    mistakes: [
      'Sitting completely upright — slight lean adds lat isolation',
      'Pulling to chin instead of upper chest',
      'Skipping the 1-sec hold at the bottom contraction',
    ],
    tip: 'Day 5 version: go lighter and focus on feeling every inch of the lat — pure mind-muscle connection, no chasing weight.',
  },
  'plate-loaded row': {
    targetMuscle: 'Lats, Rhomboids, Rear Delts',
    cues: [
      'Pull elbows BACK, not up',
      'Squeeze shoulder blades together for 1 second at end range',
      'Control the negative for 3 seconds',
    ],
    mistakes: [
      'Letting elbows flare upward',
      'Rushing the eccentric (negative)',
    ],
  },
  'cable straight-arm pulldown': {
    targetMuscle: 'Lats',
    cues: [
      'Keep arms slightly bent and LOCKED at that angle throughout the rep',
      'Lead with elbows, feel the stretch at the top',
      'Pull straight down in a sweeping arc',
    ],
    mistakes: [
      'Bending arms more during the pull — turns it into a tricep exercise',
      'Using too much weight (you can\'t isolate lats)',
    ],
  },
  'reverse pec deck': {
    targetMuscle: 'Rear Delts',
    cues: [
      'Set seat LOW so handles align exactly with your shoulders',
      'Lead with your PINKIES (slight external rotation) — maximally recruits rear delts vs upper traps',
      'Squeeze at full extension, control the return',
    ],
    mistakes: [
      'Seat too high — shifts work to upper traps',
      'Leading with knuckles instead of pinkies',
    ],
  },
  'face pull': {
    targetMuscle: 'Rear Delts, Rotator Cuff',
    cues: [
      'Cable at face height, rope attachment',
      'Pull toward your forehead with elbows HIGH (elbows above shoulder height)',
      'Externally rotate at the end — elbows go back and UP',
    ],
    mistakes: [
      'Pulling to chin or neck (wrong muscles, joint stress)',
      'Elbows dropping below shoulder height',
    ],
    tip: 'Critical for rotator cuff health. Don\'t skip this or treat it as optional.',
  },
  'bayesian cable curl': {
    targetMuscle: 'Biceps (long head, stretch-mediated)',
    cues: [
      'Stand 2 feet AHEAD of the cable origin — arm goes BEHIND your body',
      'This behind-the-body position is the stretched position — it\'s the point of the exercise',
      'Don\'t step forward during the rep (cheats the stretch)',
      'Full supination (palm fully up) at the top',
    ],
    mistakes: [
      'Standing too close to the cable — you lose the stretch advantage entirely',
      'Stepping forward during the rep to cheat',
    ],
  },
  'preacher curl': {
    targetMuscle: 'Biceps (peak contraction)',
    cues: [
      'Upper arm stays flat on the pad throughout the entire rep',
      'Stop ~20° before full extension at the bottom (protects the elbow joint)',
      'Squeeze hard at the top',
    ],
    mistakes: [
      'Lifting the upper arm off the pad — takes all tension off the bicep',
      'Going to full lockout at the bottom (elbow stress)',
    ],
  },
  'incline db press': {
    targetMuscle: 'Upper Chest',
    cues: [
      'Use 30° incline — NOT 45° (most benches default to 45°; go lower)',
      'Lower DBs to UPPER chest with elbows ~45° tucked, not flared to 90°',
      'Let the dumbbells come down deep — the stretch at the bottom is where growth happens',
    ],
    mistakes: [
      'Using 45° incline — shifts primary work to front delts, not upper chest',
      'Elbows flared to 90° — shoulder impingement risk',
    ],
  },
  'machine chest press': {
    targetMuscle: 'Chest',
    cues: [
      'Set seat so handles align with MID-CHEST, not shoulders',
      'Squeeze at lockout but don\'t fully lock elbows — keeps tension on the pec',
      'Control the return — don\'t let the weight drag your arms back',
    ],
    mistakes: [
      'Seat too high — shifts work to shoulders',
      'Full lockout (loses tension on chest)',
    ],
  },
  'incline chest fly machine': {
    targetMuscle: 'Upper Chest',
    cues: [
      'The STRETCH at the bottom is the key position — pause there briefly',
      'Squeeze at the top (imagine hugging a tree)',
      'Keep a slight bend in elbows throughout — don\'t fully extend',
    ],
    mistakes: [
      'Going too heavy — compresses range of motion and loses the stretch',
      'Not pausing or feeling the stretch at the bottom',
    ],
  },
  'cable lateral raise': {
    targetMuscle: 'Side Delts',
    cues: [
      'Cable starts at your OPPOSITE hip, crossing your body',
      'Lead with your ELBOW, not your hand',
      'Raise to slightly above shoulder height — going higher shifts to traps',
      'One arm at a time for better mind-muscle connection',
    ],
    mistakes: [
      'Leading with the hand — biceps end up doing the work',
      'Raising too high — traps take over above shoulder height',
    ],
    tip: 'Cables provide tension throughout the full range. DB lateral raises only load you near the top — cables are generally superior.',
  },
  'overhead cable tricep extension': {
    targetMuscle: 'Triceps (long head)',
    cues: [
      'Get your elbow as FAR overhead as possible — this is the stretched long-head position',
      'Most people barely get the arm past 90° — you want it fully overhead',
      'Keep elbows close to your head, don\'t let them flare out',
    ],
    mistakes: [
      'Elbow not getting overhead enough — you lose all long head stretch',
      'Elbows flaring out wide',
    ],
    tip: 'The long head gives the "horseshoe" look and is only trained in the stretched position. This exercise is uniquely effective.',
  },
  'tricep rope pushdown': {
    targetMuscle: 'Triceps (lateral + medial heads)',
    cues: [
      'SPLIT the rope apart at the bottom — this engages all three tricep heads',
      'Keep elbows pinned at your sides throughout',
      'Full extension at the bottom',
    ],
    mistakes: [
      'Not splitting the rope at the bottom',
      'Elbows drifting forward (changes the mechanics)',
    ],
  },
  'cable external rotation': {
    targetMuscle: 'Rotator Cuff (prehab)',
    cues: [
      'Elbow bent 90°, tucked FIRMLY at your side',
      'Rotate forearm outward against the cable resistance',
      'Slow and controlled — this is prehab, not a strength move',
    ],
    mistakes: [
      'Moving the elbow away from the body',
      'Going too heavy — speed kills the protective benefit',
    ],
    tip: 'This is preventive rehab for the rotator cuff. Light weight, perfect form, never skip.',
  },
  'hack squat': {
    targetMuscle: 'Quads',
    cues: [
      'Go BELOW parallel — ATG (ass-to-grass). The bottom third is where ~80% of quad growth comes from',
      'Low + narrow foot placement for maximum quad emphasis (quad sweep)',
      'Knees track over toes throughout — don\'t let them cave in',
      'Tempo: 3 sec down, 1 sec pause, 1 sec up',
    ],
    mistakes: [
      'Half squats — only loads the top half, misses the stretch entirely',
      'High foot placement — shifts to glutes/hamstrings',
      'Bouncing at the bottom (momentum, not muscle)',
    ],
    tip: 'The single biggest leg day mistake is using momentum. Every rep should take ~5 seconds total.',
  },
  'romanian deadlift': {
    targetMuscle: 'Hamstrings, Glutes',
    cues: [
      'HINGE at hips, not knees — slight knee bend that stays constant',
      'Push hips BACK as the weight lowers (feel the hamstring stretch)',
      'Bar or DBs travel close to your legs the entire way down',
      'Stop when you feel a STRONG hamstring stretch — usually mid-shin level',
    ],
    mistakes: [
      'Too much knee bend — turns it into a squat',
      'Rounding the lower back',
      'Trying to touch the floor (that\'s a stiff-leg DL, different exercise)',
    ],
  },
  'leg press': {
    targetMuscle: 'Quads, Glutes',
    cues: [
      'Don\'t lock knees at the top — removes tension and stresses the joint',
      'Control the negative for 3 seconds',
      'High foot placement targets glutes/hamstrings; lower targets quads',
    ],
    mistakes: [
      'Locking knees at the top (joint stress with no muscle benefit)',
      'Letting hips/lower back lift off the seat at the bottom (lower back injury risk)',
    ],
  },
  'lying leg curl': {
    targetMuscle: 'Hamstrings',
    cues: [
      'PLANTARFLEX your toes (point them like a ballerina) — shortens the calf, forces hamstrings to do more work',
      'Full stretch at the bottom, full squeeze at the top',
      'Control both directions',
    ],
    mistakes: [
      'Flexing feet (dorsiflexion) — lets the calf cheat',
      'Using momentum/bouncing at the bottom',
    ],
    tip: 'The plantarflex cue is one of the most underused technique tweaks. It meaningfully increases hamstring activation.',
  },
  'leg extension': {
    targetMuscle: 'Quads',
    cues: [
      'Lean back slightly — tilts the pelvis and adds rectus femoris stretch',
      'Squeeze HARD at the top — pause for 1 second',
      'Control the lowering — don\'t let the weight drop',
      'Last set to failure',
    ],
    mistakes: [
      'Leaning forward (shortens the quad stretch)',
      'Not squeezing at the top',
    ],
  },
  'seated calf raise': {
    targetMuscle: 'Soleus (deep calf)',
    cues: [
      'PAUSE 1 second at the bottom (deep stretch)',
      'PAUSE 1 second at the top (peak contraction)',
      'This is slow and controlled — not a bouncing exercise',
    ],
    mistakes: [
      'Bouncing — uses the Achilles tendon, not the muscle',
      'Partial range of motion at the bottom',
    ],
  },
  'standing calf raise': {
    targetMuscle: 'Gastrocnemius (outer calf)',
    cues: [
      'PAUSE 1 second at the bottom (deep stretch)',
      'PAUSE 1 second at the top (peak contraction)',
      'Full range of motion is critical — calves are very stretch-responsive',
    ],
    mistakes: [
      'Bouncing / using momentum',
      'Partial range of motion',
    ],
  },
  'calf raises': {
    targetMuscle: 'Calves (extra frequency)',
    cues: [
      'Pause 1 second at the bottom (deep stretch) and top (peak contraction)',
      'This is extra frequency work — keep it light and controlled',
    ],
    mistakes: [
      'Bouncing between reps',
    ],
  },
  'seated db overhead press': {
    targetMuscle: 'Anterior + Medial Delts',
    cues: [
      'NEUTRAL grip (palms facing each other) — gentler on wrists and shoulders',
      'Lower DBs until level with your ears — not below ear level',
      'Press straight up, slight arc inward at the top',
    ],
    mistakes: [
      'Lowering too far below ears (joint stress without added benefit)',
      'Pronated grip if you have wrist issues (use neutral)',
    ],
  },
  'db lateral raise': {
    targetMuscle: 'Side Delts (stretch-focused)',
    cues: [
      'Hold a cable upright or pole with one hand, lean AWAY from it',
      'This puts the working delt in a deeper stretched position than standing upright',
      'Lead with elbow, not hand',
      'Light weight — this is stretch-mediated, not heavy',
    ],
    mistakes: [
      'Standing completely upright (loses the stretch advantage)',
      'Going too heavy',
    ],
    tip: 'Lean-away technique is significantly more effective than standard DB lateral raises for side delt growth.',
  },
  'cable y-raise': {
    targetMuscle: 'Lower Traps, Shoulder Stability',
    cues: [
      'Cables from low pulleys, raise both arms overhead forming a Y shape',
      'Focus on feeling the LOWER TRAPS (between shoulder blades, lower portion)',
      'Slow and deliberate — this is stability training, not strength',
    ],
    mistakes: [
      'Using momentum',
      'Upper traps taking over (don\'t shrug)',
    ],
    tip: 'Lower traps are chronically weak in most lifters. This is a quiet investment against future shoulder pain.',
  },
  'incline db curl': {
    targetMuscle: 'Biceps (long head, maximum stretch)',
    cues: [
      'Bench at 60° (NOT 45° — less stretch at 45°)',
      'Let arms hang FULLY behind the torso — deepest possible bicep stretch',
      'No swinging — momentum defeats the entire purpose of this exercise',
      'Supinate fully at the top (palm completely up)',
    ],
    mistakes: [
      'Bench at 45° — significantly less effective stretch',
      'Swinging or using momentum (eliminates the stretch benefit)',
    ],
  },
  'overhead db tricep extension': {
    targetMuscle: 'Triceps Long Head',
    cues: [
      'Get elbows as far overhead as possible before lowering',
      'Lower weight behind head until you feel a deep tricep stretch',
      'Keep elbows close together — don\'t let them flare out',
    ],
    mistakes: [
      'Elbows flaring outward',
      'Not getting enough overhead angle before lowering',
    ],
  },
  'cable crunch': {
    targetMuscle: 'Abs',
    cues: [
      'ROUND your spine like crunching into a ball — rib cage toward pelvis',
      'The lower back stays in place; only the upper spine curls',
      'Don\'t hinge at the hips — that\'s a hip flexor exercise',
    ],
    mistakes: [
      'Hinging at the hips (turns it into a hip flexor exercise)',
      'Pulling with the arms instead of crunching the abs',
    ],
  },
  'hanging leg raise': {
    targetMuscle: 'Abs (lower), Hip Flexors',
    cues: [
      'Bring knees ABOVE belly button (or legs straight and above parallel for advanced)',
      'CRUNCH the pelvis UP at the top — a posterior tilt, not just raising legs',
      'Control the descent — no swinging',
    ],
    mistakes: [
      'Knee raises only to 90° — that\'s purely hip flexors, not abs',
      'Swinging for momentum',
    ],
  },
  'single-arm cable row': {
    targetMuscle: 'Lats, Rhomboids',
    cues: [
      'This is pump day — focus on MIND-MUSCLE CONNECTION, not heavy weight',
      'Pull elbow past your hip, squeeze the lat hard at end range',
      'Slight rotation of the torso for fuller range',
    ],
    mistakes: [
      'Going too heavy and losing the feel',
      'Not pulling elbow far enough back',
    ],
  },
  'hammer curl': {
    targetMuscle: 'Brachialis (arm thickness)',
    cues: [
      'NEUTRAL grip (palms facing each other) throughout — don\'t rotate at the top',
      'The brachialis sits UNDER the biceps and pushes them up — key for arm thickness from the side',
      'Full range, slow and controlled',
    ],
    mistakes: [
      'Supinating at the top (turns it into a bicep curl)',
      'Using momentum',
    ],
    tip: 'Most lifters skip brachialis training and wonder why their arms look thin from the side. This fixes that.',
  },
  'reverse curl': {
    targetMuscle: 'Brachioradialis, Forearms',
    cues: [
      'PRONATED grip (palms facing down) on EZ bar',
      'Trains the brachioradialis — the forearm muscle near the elbow',
      'Keep wrists neutral/straight — don\'t let them bend',
      'Go to RIR 0 — this is the last arm exercise',
    ],
    mistakes: [
      'Wrists bending excessively (take load off the target muscle)',
    ],
    tip: 'Brachioradialis is the muscle that pops when arms flex and gives the "full arm" look from the front.',
  },
  'cable pushdown': {
    targetMuscle: 'Triceps (all three heads)',
    cues: [
      'Keep elbows pinned at sides throughout',
      'Full lockout at the bottom — squeeze for 1 second',
      'Control the return — don\'t let the cable yank your arms up',
    ],
    mistakes: [
      'Elbows drifting forward (changes mechanics to a press)',
      'Partial range of motion at the bottom',
    ],
  },
  'farmer carry': {
    targetMuscle: 'Grip, Traps, Core',
    cues: [
      'Stand TALL — shoulders back and down, chest up',
      'Walk slowly and deliberately — short, controlled steps',
      'NO straps — grip IS the point of this exercise',
      'Heavy DBs for 30 seconds per set',
    ],
    mistakes: [
      'Using straps (defeats the entire purpose)',
      'Rushing the walk (uses momentum instead of grip strength)',
    ],
  },
}

function normalizeName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)/g, '')  // strip parentheticals
    .trim()
    .toLowerCase()
}

export function getExerciseTips(exerciseName: string): ExerciseTips | null {
  return TIPS[normalizeName(exerciseName)] ?? null
}

export function displayExerciseName(exerciseName: string): string {
  return exerciseName.replace(/\s*\([^)]*\)/g, '').trim()
}
