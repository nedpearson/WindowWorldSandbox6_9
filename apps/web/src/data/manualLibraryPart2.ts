/**
 * manualLibraryPart2.ts
 * Glass, Screens, Exterior Conditions, Contract, Chargeback, and Sales articles.
 *
 * ENCODING: ASCII only. No emoji literals. No curly quotes. No em/en-dash literals.
 */

import type { ManualChapter } from './manualContent';

export const manualLibraryPart2Chapters: ManualChapter[] = [

  // ============================================================
  // GLASS AND SAFETY
  // ============================================================

  {
    id: 'lib-tempered-glass',
    title: 'Tempered Glass Requirements',
    subtitle: 'When tempered glass is legally required by IRC code R308.4',
    category: 'Glass and Safety',
    roles: ['sales_rep', 'auditor'],
    tags: ['tempered', 'safety glass', 'code', 'IRC', 'required'],
    sections: [
      {
        id: 'lib-tg-what',
        title: 'What Tempered Glass Is',
        body: 'Tempered glass is a type of safety glass that has been heat-treated to make it significantly stronger than standard glass. When it breaks, it shatters into small pebbles rather than large sharp shards, dramatically reducing the risk of injury. It is also called safety glass. Tempered glass is required by building code in specific hazardous locations around a home, and ordering non-tempered glass in these locations is a serious code violation and chargeback risk.',
        rules: [
          'IRC R308.4: All glazing in hazardous locations requires safety glazing (tempered or laminated).',
          'Tempered glass is identified by a permanent label in the corner of the glass (ANSI Z97.1 or CPSC 16 CFR 1201).',
          'The label is the only legal proof of compliance -- do not order tempered without confirming it will be labeled.'
        ],
        videos: [
          {
            title: 'Window Safety Glass Requirements',
            url: 'https://www.youtube.com/watch?v=GAVCr_Yr30A',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
          {
            title: 'Tempered vs Regular Glass -- What You Need to Know',
            url: 'https://www.youtube.com/watch?v=Qihdoh9E5VM',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
        ],
      },
      {
        id: 'lib-tg-locations',
        title: 'Where Tempered Glass Is Required by Code',
        body: 'The International Residential Code (IRC) section R308.4 defines hazardous locations that require safety glazing. Any window in the following locations must be ordered with tempered glass. The measurements are from the nearest edge of the glass to the nearest water source, walking surface, door edge, or stairway tread.',
        checklist: [
          'Bathroom: any glass within 60 inches (horizontal) of a water source (tub, shower, sink).',
          'Floor level: any glass within 18 inches of the finished floor in a walking area.',
          'Door adjacent: any glass within 24 inches of a door edge and below 60 inches from floor.',
          'Stairway: any glass within 36 inches of a stairway tread.',
          'Garage door: all glazing in garage doors.',
          'Large fixed pane: single pane greater than 9 square feet in certain locations.',
          'Skylights: all sloped glazing (skylight).'
        ],
        rules: [
          'Measure the horizontal distance from the glass edge to the nearest water source for the 60-inch bathroom rule.',
          'Measure the distance from the bottom of the glass to the finished floor for the 18-inch floor rule.',
          'When in doubt, order tempered. The cost difference is small; the risk of not doing so is large.'
        ],
        chargebackRisks: [
          'Missing tempered on bathroom window within 60 inches of shower -- fails inspection, full reorder.',
          'Missing tempered on floor-level window within 18 inches -- code violation, liability risk.',
          'Missing tempered on window adjacent to front entry door -- fails inspection.'
        ],
      },
      {
        id: 'lib-tg-bathroom',
        title: 'Bathroom Window Tempered Rule In Detail',
        body: 'The 60-inch rule is the most commonly misunderstood tempered glass rule. The measurement is HORIZONTAL distance from the edge of the glass to the nearest water source -- bathtub rim, shower opening, or sink basin. It does not matter what is in between. If the closest edge of the window glass is within 60 inches of the nearest water feature measured horizontally, the glass must be tempered.',
        whatToChoose: 'Order tempered glass for any bathroom window where the closest edge of the glass is within 60 inches of any water source (measured in a horizontal line). When in doubt, order tempered.',
        whatNotToChoose: 'Do NOT skip the 60-inch measurement and assume a window is fine because it looks far away. Windows at the far end of a long bathroom can still be within 60 inches of a tub.',
        steps: [
          'Identify the nearest water source in the bathroom (tub, shower, sink).',
          'Measure horizontally from the closest edge of the glass to the nearest part of the water source.',
          'If the distance is 60 inches or less, select tempered glass in the app.',
          'If the distance is more than 60 inches, standard glass is acceptable at that location.',
          'Document the measurement in the notes field for auditor review.'
        ],
        examples: [
          'Small bathroom: window above toilet, tub is 48 inches away (horizontal) -- tempered required.',
          'Large master bath: window at far end, 72 inches from shower -- tempered not required by this rule alone, but check floor rule.',
          'Window above/adjacent to tub surround: glass edge is 12 inches from water -- definitely tempered.'
        ],
        scenario: {
          situation: 'You are measuring a bathroom window. The window is above a toilet. There is a tub in the same room. You measure the horizontal distance from the edge of the window glass to the rim of the tub and get 54 inches.',
          question: 'Should this window be ordered with tempered glass?',
          options: [
            { id: 'a', text: 'No, because the window is above a toilet, not directly above the tub.', isCorrect: false, explanation: 'The 60-inch rule measures horizontal distance to any water source -- not just what is directly below the window.' },
            { id: 'b', text: 'Yes, because the glass edge is within 60 inches (54 inches) of the tub (a water source).', isCorrect: true, explanation: 'Correct. 54 inches is less than 60 inches. The window must be tempered regardless of the fact that it is above a toilet, not the tub.' },
            { id: 'c', text: 'Only if the window is also within 18 inches of the floor.', isCorrect: false, explanation: 'The 18-inch floor rule is separate. The 60-inch bathroom rule applies independently.' },
            { id: 'd', text: 'Only if the window is a large pane over 9 square feet.', isCorrect: false, explanation: 'The 60-inch bathroom rule applies to any glazing regardless of size.' },
          ],
          correctAnswer: 'b',
          explanation: 'IRC R308.4 requires tempered glass within 60 inches (horizontal) of any water source in a bathroom. 54 inches is within the threshold.',
        },
      },
      {
        id: 'lib-tg-consequence',
        title: 'What Happens If Tempered Is Missed',
        body: 'If a window is installed without required tempered glass, the failure can be discovered by a building inspector, an insurance adjuster, or during a sale of the home. The consequence is that the non-compliant window must be replaced. The company absorbs the cost of the replacement glass and installation, and the rep may face a chargeback. Beyond the financial cost, the company faces liability if someone is injured by non-tempered glass in a hazardous location.',
        chargebackRisks: [
          'Inspector fails window at permit inspection -- glass must be reordered and reinstalled.',
          'Customer sells home and inspector discovers non-tempered glass -- costly remedy.',
          'Injury from broken non-tempered glass in a hazardous location -- liability claim.'
        ],
        warnings: [
          'When in doubt, ORDER TEMPERED. The upcharge is small; the chargeback cost is large.',
          'Do not let a customer talk you out of tempered glass in a required location -- it is a code requirement, not an option.',
          'If a customer refuses tempered glass in a required location, document the refusal and involve your manager.'
        ],
      },
    ],
  },

  {
    id: 'lib-obscure-glass',
    title: 'Obscure and Privacy Glass',
    subtitle: 'Frosted, patterned, and privacy glass options for bathrooms and sensitive areas',
    category: 'Glass and Safety',
    roles: ['sales_rep'],
    tags: ['obscure', 'privacy', 'frosted', 'glass', 'bathroom'],
    sections: [
      {
        id: 'lib-og-what',
        title: 'What Obscure Glass Is',
        body: 'Obscure glass (also called privacy glass) is glass that allows light to pass through but prevents a clear view. It is created through surface texturing, acid etching, or pattern rolling during manufacture. Obscure glass is rated on an obscurity scale: level 1 is nearly clear with minimal privacy, level 5 (or "full obscure") provides near-total privacy. The most common level used in residential windows is full obscure or chinchilla pattern. Obscure glass is a customer-selectable upgrade on most window lines.',
        whatToChoose: 'Bathroom windows, toilet rooms, shower windows, windows facing neighbors in private areas, street-level windows in bedrooms where customer wants light without visibility.',
        whatNotToChoose: 'Living rooms, main view windows, kitchens where customer wants a clear view. Do not order obscure on a window where the customer expects clear glass.',
        chargebackRisks: [
          'Ordering obscure glass when customer wanted clear -- glass must be replaced.',
          'Ordering clear glass on a bathroom window when customer expected obscure -- customer complaint and reorder.',
          'Wrong obscure pattern if customer specified a particular design.'
        ],
      },
      {
        id: 'lib-og-patterns',
        title: 'Common Obscure Glass Patterns',
        body: 'Several obscure glass patterns are available depending on the product line. Not all patterns are available in all markets. Confirm available options with your manager before promising a specific pattern to a customer.',
        examples: [
          'Chinchilla: small granular pattern, provides good privacy, most commonly available.',
          'Rain: vertical linear pattern, moderate privacy, contemporary look.',
          'Glue chip: large irregular pattern, decorative, often used in entry door sidelites.',
          'Satin: smooth frosted look, uniform privacy, clean appearance.',
          'Hammered: hammered-glass effect, decorative and privacy, often used in specialty applications.'
        ],
        tips: [
          'Show the customer a sample card if available -- obscure patterns can be hard to describe.',
          'Always write the specific pattern name on the contract, not just "obscure."',
          'Verify pattern availability with your manager before presenting options to the customer.'
        ],
      },
      {
        id: 'lib-og-contract',
        title: 'How to Order Obscure Glass',
        body: 'Select the obscure glass option in the app for the specific window that requires it. Note the pattern type in the notes field. Obscure glass will appear as a separate line item or option in the window configuration. Confirm with the customer in writing that obscure glass is selected on the specified windows.',
        checklist: [
          'Obscure glass selected in app for applicable windows.',
          'Pattern type noted in app notes.',
          'Obscure glass listed on printed contract for customer signature.',
          'Customer has confirmed which specific windows get obscure.'
        ],
      },
    ],
  },

  {
    id: 'lib-grids',
    title: 'Flat Grid vs. Contoured Grid vs. No Grid',
    subtitle: 'Understanding grid profiles, patterns, and how to order them correctly',
    category: 'Glass and Safety',
    roles: ['sales_rep'],
    tags: ['grids', 'flat grid', 'contoured', 'colonial', 'SDL', 'window options'],
    sections: [
      {
        id: 'lib-gr-overview',
        title: 'Grid Types Overview',
        body: 'Window grids are decorative dividers that sit between the panes of glass (internal grids) or are applied to the glass surface (external SDL). The two main internal grid profiles are flat and contoured. Flat grids have a uniform flat profile and look more modern. Contoured grids have a beveled or rounded profile and provide a more traditional, raised look. Neither is better -- it is a matter of the customer\'s preference and the style of their home. The most important thing is to document the choice clearly on the contract.',
        videos: [
          {
            title: 'Window Grid Styles and Patterns',
            url: 'https://www.youtube.com/watch?v=o-9H66miXA4',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
        ],
      },
      {
        id: 'lib-gr-flat',
        title: 'Flat Grid Profile',
        body: 'Flat grids have a uniform flat surface with no raised profile. From the exterior, they present a clean, contemporary appearance. They are often preferred in newer homes, contemporary architecture, and homes with clean-line exterior styles. Flat grids are less visually dominant than contoured grids.',
        whatToChoose: 'Customer prefers a modern, clean look. Home has contemporary architecture. Customer is replacing windows that already have flat grids. Customer wants grids that are subtle and not visually heavy.',
        whatNotToChoose: 'Customer wants a traditional or colonial look with a raised, beveled appearance. Existing windows have contoured grids and customer wants to match them.',
      },
      {
        id: 'lib-gr-contoured',
        title: 'Contoured Grid Profile',
        body: 'Contoured grids have a beveled, raised profile that creates shadow lines and a more traditional appearance. They are sometimes called "sculpted" or "beveled" grids. They are preferred for colonial, craftsman, and traditional-style homes. They look more like traditional wood divided lights.',
        whatToChoose: 'Customer has a traditional, colonial, or craftsman-style home. Customer wants grids that match the style of their neighborhood. Customer is replacing windows that have contoured grids and wants to maintain the look.',
        whatNotToChoose: 'Customer wants a modern, clean look. Customer has a contemporary or minimalist home.',
        chargebackRisks: [
          'Ordering contoured when customer specified flat -- grid profile is wrong, customer notices difference.',
          'Ordering flat when customer expected contoured to match existing windows.',
          'Not asking about grid profile and defaulting to wrong type.'
        ],
      },
      {
        id: 'lib-gr-patterns',
        title: 'Grid Patterns',
        body: 'Grid pattern refers to the layout of the grid dividers within the window. Common patterns include colonial, prairie, diamond, and perimeter. The pattern must be specified on the order.',
        examples: [
          'Colonial (standard): evenly spaced horizontal and vertical dividers creating multiple rectangular panes. Example: 2-over-2, 3-over-3, 6-over-6.',
          'Prairie: grid only appears on the perimeter of the glass with no center dividers. Provides a frame-like appearance with clear center.',
          'Diamond: diagonal dividers creating a diamond/argyle pattern. Less common, used in traditional and craftsman-style homes.',
          'Perimeter: grid around the outer edge only, no interior dividers.'
        ],
        tips: [
          'Ask the customer to point to an example on their home or show them a sample sheet.',
          'SDL counts matter -- a "3-over-2" colonial has 3 panes in the top sash and 2 in the bottom.',
          'Never guess the SDL count -- ask the customer or count the existing grid panes.'
        ],
        chargebackRisks: [
          'Wrong SDL count on colonial grid -- 2-over-2 ordered when customer wanted 6-over-6.',
          'Wrong pattern (prairie ordered instead of colonial).',
          'Grid pattern not specified -- factory defaults to a pattern the customer did not want.'
        ],
      },
      {
        id: 'lib-gr-nogrid',
        title: 'No Grid Option',
        body: 'Many customers prefer clear glass with no grids for an unobstructed view. If the customer does not want grids, explicitly select "No Grids" or "Clear" in the app. Do not leave the grid field blank -- a blank field may result in the factory adding a default grid.',
        tips: [
          'Ask directly: "Would you like grids or clear glass?" -- do not assume.',
          'Document "no grids" on the contract and have the customer confirm.',
          'If some windows get grids and others do not, note each window\'s grid choice individually.'
        ],
        chargebackRisks: [
          'Leaving grid field blank -- factory may apply a default grid the customer did not want.',
          'Assuming customer does not want grids without asking -- some customers definitely want them.'
        ],
      },
    ],
  },

  {
    id: 'lib-screens',
    title: 'Screens and No-Screen Rules',
    subtitle: 'Screen types, defaults, and what goes on which window',
    category: 'Glass and Safety',
    roles: ['sales_rep', 'auditor'],
    tags: ['screens', 'half screen', 'full screen', 'no screen', 'picture window'],
    sections: [
      {
        id: 'lib-sc-overview',
        title: 'Screen Basics',
        body: 'A screen blocks insects while allowing air to flow through an open window. Screens come in half-screen (covers lower half of window) and full-screen (covers full window height) versions. The default screen type varies by window style. Not all window styles accept a screen -- fixed picture windows receive no screen by default because the glass does not open. Always confirm screen choice with the customer and document it in the app.',
        checklist: [
          'Screen choice confirmed with customer for each window.',
          'Screen choice entered in app for each window individually.',
          'Fixed picture windows have "No Screen" selected.',
          'Screen charge included in quote if full screen is an upgrade from half screen.'
        ],
      },
      {
        id: 'lib-sc-picture',
        title: 'Picture Window Screen Rule',
        body: 'Fixed picture windows do NOT receive screens. Since the glass cannot open, there is no purpose for a screen. If you accidentally order a screen for a picture window, the screen will be manufactured and shipped, but it cannot be properly installed on a fixed window. This is a direct chargeback item flagged by auditors.',
        whatToChoose: 'Leave screen selection as "No Screen" for all fixed picture window units.',
        whatNotToChoose: 'Do NOT select half screen, full screen, or any screen for a pure fixed picture window.',
        warnings: [
          'This is a Level 2 auditor flag -- screens on picture windows are caught in review.',
          'If a customer specifically requests a screen for a picture window (for aesthetics), document this and escalate to manager before ordering.'
        ],
        chargebackRisks: [
          'Screen ordered for fixed picture window -- screen ships, cannot install, wasted cost.',
          'Half screen on a 6-foot fixed picture window -- impossible to install correctly.'
        ],
      },
      {
        id: 'lib-sc-casement',
        title: 'Casement and Awning Screens',
        body: 'Casement and awning windows are outswing windows, which means the screen must go on the INSIDE of the window. The interior screen is mounted in a track inside the frame and the window opens outward in front of it. These interior screens work differently from standard horizontal sliding screens. Make sure the customer understands how the interior screen works before they are surprised at installation.',
        tips: [
          'Tell the customer: "Since this window opens outward, the screen will be on the inside of the glass."',
          'Interior screens for casements slide sideways or fold -- the customer can ask the installer to show them how it works.'
        ],
      },
      {
        id: 'lib-sc-dh-slider',
        title: 'Double Hung and Slider Screens',
        body: 'Double hung windows come with a half screen by default -- the screen covers the lower half of the window. A full screen upgrade covers the entire window height and allows the upper sash to also be ventilated with the screen in place. Confirm whether the customer wants the standard half screen or the full screen upgrade. For sliders, a full-width screen that covers the operational sash area is standard.',
        whatToChoose: 'Half screen: standard choice for most customers, lower sash ventilation with screen. Full screen: customer wants to open the upper sash as well and still have a screen.',
        tips: [
          'Full screen is an upgrade in many product lines -- confirm pricing before presenting.',
          'Customers with kids or pets sometimes prefer full screens to prevent opening the upper sash.'
        ],
      },
    ],
  },

  {
    id: 'lib-energy-package',
    title: 'Argon Gas, Low-E, and the Energy Package',
    subtitle: 'What the energy package includes and how to present it to customers',
    category: 'Glass and Safety',
    roles: ['sales_rep'],
    tags: ['argon', 'low-e', 'energy package', 'glass', 'efficiency', 'options'],
    sections: [
      {
        id: 'lib-ep-argon',
        title: 'What Argon Gas Does',
        body: 'Argon is a colorless, odorless, non-toxic inert gas that is heavier than air. When argon fills the space between two panes of glass in an insulating glass unit (IGU), it slows the transfer of heat more effectively than regular air. This reduces the energy lost through the window in winter and the heat gained in summer. Argon is standard in most Window World double-pane units and is part of the energy package.',
      },
      {
        id: 'lib-ep-lowe',
        title: 'Low-E Glass Coating',
        body: 'Low-E (Low Emissivity) is a microscopic metallic coating applied to one surface of a glass pane during manufacturing. The coating reflects radiant infrared heat while allowing visible light to pass through. In winter, it reflects indoor heat back into the room. In summer, it reflects solar heat away from the home. The result is better comfort and lower heating/cooling costs. Low-E is measured by U-Factor (heat loss, lower is better) and Solar Heat Gain Coefficient (SHGC, how much solar heat enters).',
        rules: [
          'U-Factor: lower is better for energy efficiency (less heat escapes).',
          'SHGC: in cold climates, some solar gain is good (warming). In hot climates, low SHGC is preferred (blocks heat).',
          'Energy Star certification requires specific U-Factor and SHGC values depending on climate zone.'
        ],
        tips: [
          'When explaining Low-E to a customer: "Think of it like sunscreen for your home\'s glass -- it blocks heat from coming in during summer and keeps warmth inside during winter."',
          'Customers in northern climates especially benefit from Low-E because of long heating seasons.'
        ],
        videos: [
          {
            title: 'Low-E Glass and Argon Gas Explained',
            url: 'https://www.youtube.com/watch?v=qL_ezqH5w1k',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
          {
            title: 'Energy Efficient Windows -- How They Work',
            url: 'https://www.youtube.com/watch?v=YO8uUGD9URY',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
        ],
      },
      {
        id: 'lib-ep-package',
        title: 'The Energy Package',
        body: 'The energy package combines Low-E glass, argon gas fill, and an enhanced warm-edge spacer bar into a single upgrade. It is the most common glass upgrade sold. Customers benefit from reduced drafts, less condensation on the glass, and lower utility bills. The energy package is a straightforward upsell: the price difference is often small relative to the long-term savings, and most customers choose it when it is explained correctly.',
        steps: [
          'Present the energy package to every customer.',
          'Explain Low-E, argon, and warm-edge spacer in simple terms.',
          'Mention comfort benefits: fewer drafts, less condensation, more consistent room temperature.',
          'Mention the energy savings angle if customer is cost-conscious.',
          'Confirm energy package selection in the app for each window.',
          'Note energy package on the printed contract for customer review.'
        ],
        tips: [
          'Do not skip presenting the energy package even if you think the customer will not buy it.',
          'Present it as the recommended choice: "Most of our customers choose the energy upgrade for this reason..."',
          'If the customer declines, note the decline in the app to show it was offered.'
        ],
        chargebackRisks: [
          'Customer expected energy package and it was not ordered -- must reorder glass.',
          'Energy package ordered but not noted on contract -- customer disputes the charge.'
        ],
      },
    ],
  },

  // ============================================================
  // EXTERIOR CONDITIONS
  // ============================================================

  {
    id: 'lib-exterior-brick',
    title: 'Brick Exterior Openings',
    subtitle: 'How to measure, photograph, and document brick-faced window openings',
    category: 'Exterior Conditions',
    roles: ['sales_rep', 'auditor'],
    tags: ['brick', 'exterior', 'measurement', 'return depth', 'deduction'],
    sections: [
      {
        id: 'lib-eb-identify',
        title: 'Identifying a Brick Exterior',
        body: 'True brick is a solid masonry material -- rectangular fired clay units laid in mortar. Brick veneer is a single layer of brick applied over a wood-frame wall. Both create a tight window opening with specific measurement requirements. Distinguish brick from stone (irregular shapes, mortar-heavy) and from stucco (smooth or textured plaster finish). Brick openings have a specific reveal width that is the usable space for the replacement window.',
        tips: [
          'If you can see mortar between rectangular units, it is brick.',
          'Tap the wall: brick sounds solid. Stucco sounds hollow. Wood siding sounds hollow.',
          'If unsure, photograph and ask your manager before proceeding.'
        ],
        videos: [
          {
            title: 'How to Measure Windows in Brick Openings',
            url: 'https://www.youtube.com/watch?v=RjXNEza6jmY',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
          {
            title: 'Replacement Window Installation in Brick',
            url: 'https://www.youtube.com/watch?v=SMuPnK3Z3k8',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
        ],
      },
      {
        id: 'lib-eb-measure',
        title: 'Measuring a Brick Opening',
        body: 'For a brick opening, measure inside the brick reveal -- from brick to brick. This is different from a siding opening where you measure inside the existing frame. Take three width measurements (top, middle, bottom) inside the brick and use the smallest. Take three height measurements (left, center, right) and use the smallest. Photograph the tape measure in the opening to document. The deduction rule for brick differs from siding -- always verify with your manager.',
        steps: [
          'Place tape inside the brick reveal at the top of the opening.',
          'Measure brick edge to brick edge across the full width.',
          'Record the measurement.',
          'Repeat at center and bottom of opening.',
          'Use the smallest of the three width measurements.',
          'Repeat process for height (left, center, right of opening).',
          'Photograph tape measure in the opening.',
          'Measure and record return depth separately.'
        ],
        chargebackRisks: [
          'Measuring to the outside of the brick mold instead of inside the brick reveal.',
          'Using the largest measurement instead of smallest -- window too wide to fit brick opening.',
          'Using a siding deduction rule on a brick opening -- wrong order size.'
        ],
      },
      {
        id: 'lib-eb-return',
        title: 'Return Depth for Brick Openings',
        body: 'Measure the return depth by holding the tape at the face of the brick and measuring in to the existing window frame. Brick openings commonly have return depths of 2, 3, or 4 inches or more. Deeper returns affect the type of exterior trim needed and may require custom sill extensions. Always measure and record return depth for every brick opening.',
        installerNotes: [
          'Return depth determines whether standard trim works or if a custom sill extension is needed.',
          'Deep return depths (4 inches or more) require more time for installers to properly seat and flash the window.',
          'If the existing brick mold has been painted or caulked many times, the return depth may be reduced.'
        ],
        examples: [
          '2-inch return depth: standard, most insert products fit without special trim.',
          '3-inch return depth: common on older brick homes, note in app and verify with manager.',
          '4-inch return depth: flag for manager review -- may require custom sill extension or special order.'
        ],
      },
      {
        id: 'lib-eb-photos',
        title: 'Required Photos for Brick Openings',
        body: 'Brick openings require more detailed photography than siding openings because the installer needs to see the full brick reveal, the condition of the existing frame and brick, and the return depth.',
        checklist: [
          'Exterior photo showing full brick opening in context of wall.',
          'Close-up of brick reveal with tape measure showing width.',
          'Close-up showing return depth with tape measure.',
          'Photo of header (top of brick opening) showing lintel condition.',
          'Photo of any cracks, gaps, or damage in mortar around opening.',
          'Interior photo of existing window frame and stops.'
        ],
      },
    ],
  },

  {
    id: 'lib-exterior-siding',
    title: 'Siding Exterior Openings',
    subtitle: 'Measuring and documenting windows in vinyl, wood, or fiber cement siding',
    category: 'Exterior Conditions',
    roles: ['sales_rep'],
    tags: ['siding', 'exterior', 'vinyl siding', 'J-channel', 'measurement'],
    sections: [
      {
        id: 'lib-es-types',
        title: 'Types of Siding Exteriors',
        body: 'Siding comes in several types, each with different installation requirements for replacement windows. The most common residential siding types are: vinyl (most common), aluminum, T1-11 plywood, fiber cement (Hardie board), and wood clapboard. Siding openings are generally more forgiving than brick because J-channel trim can be cut to fit. Still, note the siding type for every window to help the installer prepare.',
        examples: [
          'Vinyl siding: flexible, J-channel wraps around window, most common new installation.',
          'Aluminum siding: older homes, similar to vinyl but less flexible, may require special trim.',
          'T1-11: sheet plywood with grooves, older homes and outbuildings, trim can be nailed directly.',
          'Fiber cement (Hardie board): heavy, moisture-resistant, paint-ready, requires special cut tools.',
          'Wood clapboard: painted horizontal wood planks, traditional, may have rot issues around window.'
        ],
        tips: [
          'Note the siding type in the app for every window -- the installer will prepare the right materials.',
          'If you cannot identify the siding type, photograph it and ask your manager.',
          'Older aluminum siding may be fragile -- note this to the installer.'
        ],
        videos: [
          {
            title: 'Vinyl Siding Basics -- Types and Installation',
            url: 'https://www.youtube.com/watch?v=zv4Ksw05eVk',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
        ],
      },
      {
        id: 'lib-es-measure',
        title: 'Measuring a Siding Opening',
        body: 'For a siding opening (non-brick), measure inside the existing window frame -- from stop to stop. Take three width measurements and three height measurements; use the smallest for each dimension. The existing J-channel or exterior trim is NOT included in the measurement. The new window will be positioned inside the existing frame and trimmed with new J-channel on the outside.',
        steps: [
          'Measure inside the existing window frame (stop to stop) at top.',
          'Repeat at center and bottom.',
          'Use smallest width measurement.',
          'Measure height inside frame at left, center, right.',
          'Use smallest height measurement.',
          'Enter actual measurements in the app.',
          'Note siding type in app notes.'
        ],
      },
      {
        id: 'lib-es-flashing',
        title: 'Header Flashing and J-Channel',
        body: 'When a window is replaced in siding, new J-channel is typically installed around the perimeter of the new window to create a watertight seal between the window frame and the siding. A header flashing (a pre-bent aluminum or vinyl piece) is installed above the window to divert water away from the window top. These items are typically included in the installation scope but may be charged separately in some markets. Verify with your manager.',
        installerNotes: [
          'J-channel must be properly snapped into siding for a watertight seal.',
          'Header flashing must overlap J-channel and be caulked at corners.',
          'If existing J-channel is in poor condition, installer will replace it -- document existing condition.'
        ],
        checklist: [
          'Siding type noted in app.',
          'Header flashing included in scope confirmed.',
          'J-channel included in scope confirmed.',
          'Any existing J-channel damage photographed.',
          'Any existing caulking condition photographed.'
        ],
        chargebackRisks: [
          'Header flashing not included in quote when required -- installer arrives without materials, delays job.',
          'Not noting damaged J-channel that requires extra work.'
        ],
      },
    ],
  },

  {
    id: 'lib-window-removal',
    title: 'Window Removal Charges',
    subtitle: 'When removal is standard, when it is charged extra, and how to document it',
    category: 'Exterior Conditions',
    roles: ['sales_rep', 'auditor'],
    tags: ['removal', 'full frame', 'insert', 'charge', 'installation'],
    sections: [
      {
        id: 'lib-wr-insert-vs-ff',
        title: 'Insert Replacement vs. Full-Frame Replacement',
        body: 'There are two types of replacement window installations. An insert replacement removes only the sash and leaves the existing frame and exterior trim in place. The new window slides into the existing frame. This is the most common and least expensive method. A full-frame replacement removes the entire existing window including the frame, interior stops, exterior trim, and brick mold, then installs a completely new window unit into the rough opening. Full-frame is more expensive and may require additional carpentry, but is necessary when the existing frame is rotted, out of square, or when upgrading to a different size window.',
        whatToChoose: 'Insert replacement: existing frame is solid, square, and in good condition. Standard residential replacement in most siding or brick situations.',
        whatNotToChoose: 'Insert for a rotted frame -- the rot will continue and cause moisture problems. Full-frame when insert is sufficient -- unnecessary cost.',
      },
      {
        id: 'lib-wr-charges',
        title: 'What Triggers a Removal Charge',
        body: 'Standard insert replacement typically includes removal of the existing sash. Additional charges may apply for: full-frame tear-out, removal of existing storm windows, removal of interior stop trim that is painted shut, removal of awning or casement hardware, and disposal of large or multiple units. Verify with your manager what is included in the standard scope in your market.',
        checklist: [
          'Type of replacement determined: insert or full-frame.',
          'Any storm windows present that need removal.',
          'Any interior stops painted shut.',
          'Any large or heavy units that require special handling.',
          'Disposal method confirmed for existing windows.'
        ],
        chargebackRisks: [
          'Full-frame scope not noted -- installer arrives expecting insert job, finds rotted frame, delays.',
          'Storm window removal not included in quote -- installer charges at site.',
          'Interior stops not removable without damage -- extra labor cost.'
        ],
      },
      {
        id: 'lib-wr-identify',
        title: 'How to Identify Which Type Is Needed',
        body: 'Ask the customer about the history of the windows. Check the existing frame during measurement. Look for rot, water damage, or significant out-of-plumb conditions. If you notice any of the following, it may require full-frame replacement: soft wood, dark staining, crumbling frame material, gaps between frame and rough opening, visible mold.',
        steps: [
          'Inspect the frame around each window opening.',
          'Press gently on the wood -- soft spots indicate rot.',
          'Look for dark staining or water damage on the stool (interior sill) and apron.',
          'Check if the frame is square by measuring diagonally (equal diagonals = square).',
          'Photograph any suspected rot or damage.',
          'If rot or major damage is found, note "Full Frame Required" and involve manager before quoting.'
        ],
        tips: [
          'A 2-inch wide putty knife tapped into a wood frame identifies rot quickly -- soft areas are a problem.',
          'Never hide rot from the customer -- disclose it and explain the full-frame option.',
          'Rot found by the installer on installation day that was not documented causes delays and disputes.'
        ],
      },
    ],
  },

  // ============================================================
  // CONTRACT AND CLOSE
  // ============================================================

  {
    id: 'lib-contract-completion',
    title: 'Contract Completion Checklist',
    subtitle: 'Every field that must be complete before a contract is submitted',
    category: 'Contract and Close',
    roles: ['sales_rep', 'manager', 'auditor'],
    tags: ['contract', 'checklist', 'required fields', 'submission', 'close'],
    sections: [
      {
        id: 'lib-cc-customer-info',
        title: 'Required Customer Fields',
        body: 'Every contract must have complete customer information before it can be processed. Missing information causes delays in scheduling, financing, and permit applications. Collect and enter all required fields at the time of the appointment.',
        checklist: [
          'Full legal name of homeowner (as on deed/ID).',
          'Service address (where windows are being installed).',
          'Billing address if different from service address.',
          'Primary phone number -- must be a working number.',
          'Email address -- must be valid for contract delivery and scheduling.',
          'Secondary contact or co-owner name if applicable.',
          'Best time to reach customer.',
          'Contract date (date of signature).'
        ],
        warnings: [
          'A contract without a valid phone number cannot be scheduled -- it will sit in queue.',
          'A contract without a valid email cannot receive the digital copy or scheduling notifications.',
          'If service address differs from billing, both must be explicitly noted.'
        ],
      },
      {
        id: 'lib-cc-window-items',
        title: 'Window Line Items -- Required Fields Per Window',
        body: 'Every window on the contract must have all required information. A line item with missing fields will be flagged by the auditor and cannot be sent to production. Build each window record carefully in the app.',
        checklist: [
          'Room or location label (e.g., "Master Bedroom Left," "Kitchen Sink").',
          'Window type (double hung, slider, casement, picture, etc.).',
          'Width measurement (inches and fraction).',
          'Height measurement (inches and fraction).',
          'Glass option (standard, Low-E, energy package, obscure).',
          'Grid option (no grids, flat colonial, contoured prairie, etc.).',
          'Screen option (half screen, full screen, no screen).',
          'Tempered glass flag (yes/no -- must be affirmatively set).',
          'Exterior condition (siding, brick, wood, stucco).',
          'Color (interior and exterior).',
          'Unit price.',
          'Any special notes or conditions for this specific window.'
        ],
        chargebackRisks: [
          'Missing room label -- installer does not know where to install the window.',
          'Missing glass option -- production defaults to standard when customer paid for energy package.',
          'Missing tempered flag on a required location -- code violation.',
          'Missing screen choice -- wrong screen type shipped or screen missing entirely.'
        ],
      },
      {
        id: 'lib-cc-signatures',
        title: 'Required Signatures and Acknowledgments',
        body: 'Every contract requires the customer\'s signature before it can be submitted. Some markets and product lines require additional initials on specific pages. Financing documents have their own signature requirements. Never submit an unsigned contract.',
        checklist: [
          'Customer signature on main contract.',
          'Customer initials on any change order pages.',
          'Customer signature on financing documents if applicable.',
          'Customer has received a copy of the signed contract (email or print).',
          'Three-day right of rescission notice provided if required by state law.'
        ],
        warnings: [
          'Submitting an unsigned contract is a serious policy violation in most markets.',
          'A right of rescission (3-day cooling off) period may be required by state law -- know your local rules.',
          'If a customer signs on a tablet, confirm the signature was captured and saved before leaving.'
        ],
      },
      {
        id: 'lib-cc-common-missing',
        title: 'Top Reasons Contracts Are Sent Back',
        body: 'Auditors review every contract before it goes to production. The most common reasons for a contract being sent back are missing fields that delay the entire job. Knowing the top issues helps reps avoid them.',
        examples: [
          'No customer phone number on file.',
          'Missing room label on one or more windows.',
          'Screen choice left blank (especially on casements or special windows).',
          'Tempered glass field not completed for bathroom or floor-level windows.',
          'Price without glass package specified.',
          'No exterior condition noted for one or more windows.',
          'Unsigned contract submitted.',
          'Measurements entered as deducted size instead of actual size.'
        ],
      },
    ],
  },

  {
    id: 'lib-order-accuracy',
    title: 'Order Form Accuracy and Red Flags',
    subtitle: 'How to review an order before submitting to catch errors early',
    category: 'Contract and Close',
    roles: ['sales_rep', 'manager', 'auditor'],
    tags: ['order', 'accuracy', 'review', 'red flags', 'audit'],
    sections: [
      {
        id: 'lib-oa-self-review',
        title: 'How to Self-Review Before Submitting',
        body: 'Before you submit any contract, read through every line of the order as if you are seeing it for the first time. Imagine you are the installer who will receive this order. Does everything make sense? Can you tell which window goes where? Are all the options correct? This self-review takes 2-3 minutes and can prevent a costly reorder.',
        steps: [
          'Open the completed order in the app.',
          'Count the number of windows -- does it match the physical count at the home?',
          'Read each window record: location, type, size, glass, grids, screen, tempered.',
          'Verify measurements look reasonable for the room described.',
          'Check that tempered is flagged for all bathrooms, floor-level, and door-adjacent windows.',
          'Verify no picture windows have screens.',
          'Confirm all oriel windows have top sash measurements.',
          'Check the total price makes sense for the number of windows.',
          'Submit or escalate to manager if any uncertainty remains.'
        ],
        tips: [
          'If you are tired or rushed, wait until you have a clear moment to review -- a rushed review misses errors.',
          'Compare the order on the screen to the photos you took -- do they match?',
          'If you are unsure about anything, call your manager before submitting.'
        ],
      },
      {
        id: 'lib-oa-red-flags',
        title: 'Order Red Flags That Need Manager Review',
        body: 'Some order characteristics should always trigger a manager review before submission. These are not necessarily errors, but they carry a higher risk of problems and benefit from a second set of eyes.',
        checklist: [
          'Any bay or bow window order.',
          'Any shape (geometric/specialty) window.',
          'Any oriel window.',
          'Any order with more than 15 units.',
          'Any brick opening with 4-inch or deeper return depth.',
          'Any large picture window (over 9 sq ft) near floor or door.',
          'Any customer-requested changes to standard products.',
          'Any financing-involved order.',
          'Any order where the total price seems unusually high or low.'
        ],
        warnings: [
          'Never submit a bay or bow order without manager review.',
          'Never submit a shape/geometric window order without physical template and manager approval.',
          'If a customer calls in a change after you leave, do NOT update the order without issuing a change order form and getting a new signature.'
        ],
      },
    ],
  },

  {
    id: 'lib-chargeback-prevention',
    title: 'Chargeback Prevention',
    subtitle: 'How to protect yourself, the customer, and the company from costly order errors',
    category: 'Contract and Close',
    roles: ['sales_rep', 'manager', 'auditor'],
    tags: ['chargeback', 'prevention', 'error', 'cost', 'reorder'],
    sections: [
      {
        id: 'lib-cb-what',
        title: 'What Is a Chargeback',
        body: 'A chargeback occurs when a window, door, or siding product is ordered incorrectly and must be returned to the factory or remanufactured. The company absorbs the cost of the incorrect product, shipping, and replacement manufacturing. Depending on company policy, the rep responsible for the error may be accountable for part or all of the chargeback cost. Chargebacks also delay the customer\'s installation and damage trust.',
        warnings: [
          'Chargebacks can cost hundreds to thousands of dollars per unit.',
          'Some chargebacks are impossible to recover from -- for example, a shape window ordered without a template cannot be returned for a refund.',
          'Repeated chargebacks are a performance issue that can affect employment status.'
        ],
      },
      {
        id: 'lib-cb-top-causes',
        title: 'Top Chargeback Causes',
        body: 'Understanding the most common chargeback causes helps reps focus their attention on the highest-risk areas. These are the issues that result in the most reorders.',
        chargebackRisks: [
          'Wrong measurement -- window too large to fit or too small to look correct.',
          'Missing tempered glass flag on bathroom, floor-level, or door-adjacent windows.',
          'Missing top sash measurement on oriel window.',
          'Wrong window type entered (e.g., slider entered as double hung).',
          'Wrong screen type (screen on picture window, wrong screen for casement).',
          'Wrong handing on entry door or casement window.',
          'Missing or wrong grid specification (wrong pattern, wrong count, flat vs. contoured).',
          'Wrong exterior condition entered (brick vs. siding deduction rule applied incorrectly).',
          'Address error -- product delivered to wrong location.',
          'Unsigned change order for any modification after original contract.'
        ],
      },
      {
        id: 'lib-cb-how-to-prevent',
        title: 'How to Prevent Chargebacks',
        body: 'Most chargebacks are preventable with consistent process. Following the measurement and documentation checklist on every appointment is the single most effective chargeback prevention practice. Shortcuts in measurement, documentation, and review are the primary cause of reorders.',
        steps: [
          'Measure every window -- never estimate or copy from old records.',
          'Take three measurements per dimension and use the smallest.',
          'Photograph every window inside and outside before leaving the appointment.',
          'Enter each window fully in the app before moving to the next -- do not batch-enter later.',
          'Flag tempered glass for every bathroom, floor-level, and door-adjacent window.',
          'Measure oriel top sash separately and enter separately.',
          'Review the full order before submission.',
          'Have manager review high-risk orders before submission.',
          'Issue a change order (with new customer signature) for any changes after the original contract.'
        ],
        tips: [
          'The 5 minutes you spend verifying measurements today saves 5 days of reorder delay and hundreds of dollars.',
          'If something feels uncertain, ask your manager -- that is what they are there for.',
          'Use the app checklist -- it was designed to catch common errors.'
        ],
      },
      {
        id: 'lib-cb-after',
        title: 'What Happens After a Chargeback',
        body: 'If a chargeback occurs, the process typically involves: the error is identified at production or on installation day, the incorrect product is flagged, the manager is notified, the rep is contacted to provide correct information, a corrected order is submitted, and a new delivery is scheduled. The customer is notified of the delay. The financial accountability determination follows company policy.',
        scenario: {
          situation: 'You submitted an order for a bathroom double hung window and selected standard glass. The installer arrives and finds the window is within 36 inches of the shower. The window is installed without tempered glass. Six months later, the customer sells the home. The home inspector flags the non-tempered glass. The buyer demands it be replaced.',
          question: 'Who bears responsibility for this issue and what should have been done?',
          options: [
            { id: 'a', text: 'The installer should have caught it -- it is their fault.', isCorrect: false, explanation: 'Installers are not always expected to verify tempered specifications -- the rep is responsible for correctly documenting the tempered requirement at the time of measurement.' },
            { id: 'b', text: 'The rep is responsible for not flagging the tempered glass requirement during measurement. The correct process is to measure the horizontal distance from the glass to the water source, flag it in the app, and order tempered glass.', isCorrect: true, explanation: 'Correct. The rep is responsible for identifying and documenting all tempered glass locations during the appointment. Proper documentation and ordering would have prevented this entirely.' },
            { id: 'c', text: 'The customer should have known their bathroom needed tempered glass.', isCorrect: false, explanation: 'The rep is the professional. The customer relies on the rep to correctly identify code requirements.' },
            { id: 'd', text: 'This is just a code technicality and does not need to be fixed.', isCorrect: false, explanation: 'Non-compliant glazing in a hazardous location is a building code violation. It must be corrected and may create liability.' },
          ],
          correctAnswer: 'b',
          explanation: 'The rep is responsible for measuring the horizontal distance from the glass to any water source, identifying the tempered glass requirement, flagging it in the app, and ordering tempered glass. This is the core skill of the measurement phase of every appointment.',
        },
      },
    ],
  },

  // ============================================================
  // SALES AND FOLLOW-UP
  // ============================================================

  {
    id: 'lib-followup',
    title: 'Follow-Up and Closing',
    subtitle: 'How to follow up effectively and close more sales without being pushy',
    category: 'Sales and Follow-Up',
    roles: ['sales_rep', 'manager'],
    tags: ['follow-up', 'closing', 'sales', 'scripts', 'outreach'],
    sections: [
      {
        id: 'lib-fu-why',
        title: 'Why Follow-Up Wins Sales',
        body: 'Most sales are not closed on the first contact. Research consistently shows that 80% of sales require 5 or more follow-up contacts, yet the vast majority of salespeople give up after one or two attempts. The rep who follows up consistently wins. This is especially true in the home improvement industry, where customers get multiple quotes and take time to decide. A structured follow-up process communicates reliability and respect for the customer\'s decision timeline.',
        tips: [
          'Never leave an appointment without scheduling the next step -- even if it is just "I will send you the quote and follow up Thursday."',
          'Follow-up is not pestering -- customers expect it. A rep who does not follow up looks uninterested.',
          'Take notes during the appointment about the customer\'s timeline and concerns -- reference them in follow-up.'
        ],
        videos: [
          {
            title: 'In-Home Sales Closing Tips',
            url: 'https://www.youtube.com/watch?v=OdVOdmQ0a4s',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
        ],
      },
      {
        id: 'lib-fu-day1',
        title: 'Same-Day Follow-Up (Within 2 Hours)',
        body: 'Send a follow-up text and email within 2 hours of leaving the appointment. Thank the customer for their time, confirm the quote is attached or will arrive shortly, and set a specific next-step expectation. This immediate follow-up positions you as responsive and professional.',
        examples: [
          'Text: "Hi [Name], this is [Rep Name] from Window World. It was great meeting you today! I just emailed your quote. Happy to answer any questions. I will follow up Thursday -- have a great evening!"',
          'Email subject: "Your Window World Quote from Today\'s Appointment"',
          'Email body: brief thank you, quote attached, note 2-3 key features discussed, invitation to call or reply.'
        ],
        steps: [
          'Send thank-you text within 2 hours of leaving.',
          'Send email with attached quote within 2 hours.',
          'Reference one or two things discussed at the appointment (specific windows, concerns, timeline).',
          'State when you will follow up next.',
          'Keep it brief -- this is a warm touch, not a sales pitch.'
        ],
      },
      {
        id: 'lib-fu-schedule',
        title: 'Follow-Up Schedule',
        body: 'A structured follow-up schedule ensures no customer falls through the cracks. Adjust based on the customer\'s stated timeline: if they said "we are not ready for 6 months," space your follow-ups accordingly.',
        steps: [
          'Day 0 (appointment day): Thank-you text + email with quote.',
          'Day 3: Brief check-in call -- "Just checking in to see if you had a chance to review the quote."',
          'Day 7: Email with relevant information (e.g., current promotion, energy savings article, customer review).',
          'Day 14: Final follow-up call -- "I want to make sure you have everything you need to make your decision."',
          'After Day 14: If no response, flag for manager review. One final outreach and then mark as closed/lost.'
        ],
        tips: [
          'Reference your notes in each follow-up -- "You mentioned you were hoping to be done before winter..."',
          'Vary your communication method: text, call, email. Not all customers respond to the same channel.',
          'Document every follow-up attempt in the app with the date and outcome.'
        ],
      },
      {
        id: 'lib-fu-scripts',
        title: 'What to Say on Follow-Up Calls',
        body: 'The goal of a follow-up call is to identify any objections, answer questions, and move toward a decision. Do not open with a hard sell. Open by checking in, then listen.',
        examples: [
          'Opening: "Hi [Name], this is [Rep Name] from Window World. I just wanted to check in and see if you had any questions about the quote."',
          'If they say they are still thinking: "Totally understand. Is there anything specific you are comparing or any concerns I can address?"',
          'If they mention a competitor quote: "I appreciate you letting me know. Would it be helpful if I explained what sets our product and service apart? I want to make sure you have all the information."',
          'Closing the follow-up: "I will give you your space. I am here if you need anything. Is it okay if I check in again next week?"'
        ],
        tips: [
          'Listen twice as much as you talk on a follow-up call.',
          'If a customer says they are going with a competitor, ask what drove the decision -- it helps you improve.',
          'A graceful loss now can become a referral or future customer -- always be professional at the end of a follow-up.'
        ],
      },
    ],
  },

  {
    id: 'lib-objections',
    title: 'Handling Common Objections',
    subtitle: 'Real-world responses to the objections every rep hears',
    category: 'Sales and Follow-Up',
    roles: ['sales_rep'],
    tags: ['objections', 'sales', 'price', 'thinking about it', 'competitor'],
    sections: [
      {
        id: 'lib-ob-price',
        title: 'Price Objection: "That\'s More Than I Expected"',
        body: 'The price objection is the most common objection in home improvement sales. The key is to understand whether the customer is shocked by the total, comparing to a competitor quote, or genuinely unable to afford it. Each requires a different response. Do not immediately discount -- explore the objection first.',
        steps: [
          'Acknowledge the concern: "I understand, it is a significant investment."',
          'Ask a clarifying question: "Is this more than you were budgeting, or did you get a lower quote somewhere else?"',
          'Address accordingly: if budgeting concern, explore financing options; if competitor quote, discuss value difference.',
          'Review what is included: energy package, warranty, installation, cleanup.',
          'If financing is available, present monthly payment view rather than total cost.'
        ],
        examples: [
          'Customer: "Your quote is $3,200 for 4 windows. The other company quoted $2,400." Rep: "I appreciate you sharing that. A few things I would want to know: what product line, what warranty, and what their installation includes. Our quote includes the energy package, lifetime warranty, and full cleanup. Can I compare what is in each quote?"',
          'Customer: "I only have $2,000 to spend." Rep: "Let\'s see what we can do. We have financing that might let you get exactly what you need now and pay over time. Would you like to see what that looks like?"'
        ],
        tips: [
          'Never say "I can match that price" without manager authorization.',
          'The cheapest window is often the most expensive decision -- help the customer understand value.',
          'Some customers are testing you to see if you will discount. Stay calm and confident.'
        ],
      },
      {
        id: 'lib-ob-thinking',
        title: 'Stall Objection: "We Need to Think About It"',
        body: 'The "think about it" response usually means one of three things: the customer has an unspoken concern they did not voice, they need to discuss it with their partner, or they are waiting to get more quotes. Ask a clarifying question before accepting this response.',
        steps: [
          'Respond with: "Of course, it is a big decision. Can I ask -- is there a specific concern I can address now that might help?"',
          'If they have a partner: "Is your spouse or partner involved in the decision? I am happy to schedule a time when I can present to both of you."',
          'If they are getting more quotes: "That makes sense. Is there anything I can help you compare or questions you want answered before you look at other options?"',
          'Always confirm the next step before leaving: "When do you think you will have a chance to talk it over? Can I follow up on Thursday?"'
        ],
        tips: [
          'Never pressure someone who genuinely needs time -- it backfires.',
          'A customer who says "we need to think about it" but agrees to a Thursday follow-up is still very much in play.',
          'Ask open-ended questions to uncover the real concern: "What would need to be true for you to feel ready to move forward?"'
        ],
      },
    ],
  },

];
