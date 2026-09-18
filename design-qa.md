# CONTACT Design QA

## Scope

- Target: `#contact` only
- Source visual truth:
  - `docs/references/desktop/11_Bashiiin_Desktop_Contact_Reference.png` (1672 × 941)
  - `docs/references/mobile/24_Bashiiin_Mobile_Contact_Reference.png` (941 × 1672)
- Browser-rendered implementation:
  - `/tmp/bashiiin-contact-1440.png` (1440 × 945)
  - `/tmp/bashiiin-contact-768.png` (768 × 1180)
  - `/tmp/bashiiin-contact-390.png` (390 × 1038)
- CSS viewports: 1440px, 768px, and 390px at device scale factor 1
- State: default form; empty-submit validation also tested at 390px

## Findings

- No actionable P0, P1, or P2 mismatch remains in the requested scope.
- Fonts and typography: the existing Mincho H2 and sans-serif form typography are preserved. `お問い合わせはこちら。` remains one visual line at all checked widths; it renders at 46px on 1440px and 32.76px on 390px without clipping.
- Spacing and layout rhythm: Desktop retains the two-column composition with copy and form aligned at the same top edge. The form card uses 34px padding, 20px field gaps, 48px controls, and a 200px textarea. Mobile uses 20px/16px card padding, 17px field gaps, 46px controls, and a fixed 150px textarea.
- Colors and visual tokens: the existing cream background, off-white form card, burnt-orange eyebrow/required badges, fine gray borders, and charcoal type remain consistent with the reference and surrounding page.
- Image quality and asset fidelity: no CONTACT image was added, as explicitly required. The reference image is therefore an intentional structural difference rather than a missing implementation asset.
- Copy and content: all existing confirmed text remains unchanged. No response-time, product, order, interview, or other unconfirmed claims from the reference were introduced.

## Full-view comparison evidence

Desktop reference and 1440px implementation were opened in the same comparison input. Both retain a copy-left/form-right hierarchy and a restrained bordered form card. The implementation is intentionally more compact and omits the reference photograph and unconfirmed copy.

Mobile reference and 390px implementation were opened in the same comparison input. Both keep a single-line H2, stacked fields, small required badges, supporting privacy text, and a full-width submit action. The implementation retains the required preview notice and omits the reference photograph.

No focused crop was required because the full-section captures keep the H2, badge sizes, field spacing, character count, purpose copy, textarea, and button clearly readable at native density.

## Measured checks

- 1440px: document width equals viewport width; section height 945.33px; copy and form share the same initial top edge; form card height 713.95px; textarea height 200px.
- 768px: document width equals viewport width; section height 1180.19px; single-column responsive layout; form card height 713.95px; textarea height 200px.
- 390px: document width equals viewport width; section height 1038.11px; form card height 606.92px; textarea height 150px; submit width 324px inside the form padding; required badge font size 9px.
- Empty-submit validation produced three inline field errors and the existing form status message, with three `aria-invalid="true"` controls and no submission.
- No browser runtime exceptions or horizontal overflow were recorded.

## Comparison history

- First pass found one P2 density issue: the Mobile textarea remained 192.78px tall because the `rows="6"` intrinsic size exceeded the CSS minimum.
- Fix: Mobile textarea now receives an explicit 150px height and matching minimum height.
- Post-fix evidence: the 390px capture shows a 150px textarea, a 606.92px form card, intact character count/purpose/button spacing, and no overflow.

## Expected differences

- CONTACT photography and reference-only decorative elements are intentionally absent per the current brief.
- The preview warning remains because form delivery is not connected; the reference's response-time and broader inquiry claims remain omitted because they are unconfirmed.

## Final result

passed
