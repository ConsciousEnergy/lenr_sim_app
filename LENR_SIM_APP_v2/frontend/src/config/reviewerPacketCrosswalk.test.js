/**
 * Honesty locks for Packet A–E ↔ ledger / PRED / EQ-OPEN crosswalk.
 */
import {
  CROSSWALK_OPEN_EQ_IDS,
  LEGACY_IL_TO_LEDGER,
  PACKET_CROSSWALK_HONESTY,
  PACKET_CROSSWALK_ROWS,
  assertPacketCrosswalkHonesty,
} from './reviewerPacketCrosswalk';
import { OPEN_EQ_IDS } from './unifiedTheoryScienceEvidence';

describe('reviewerPacketCrosswalk honesty', () => {
  test('assertPacketCrosswalkHonesty does not throw', () => {
    expect(() => assertPacketCrosswalkHonesty()).not.toThrow();
  });

  test('lenr_proved stays false and EQ-OPEN stay OPEN', () => {
    expect(PACKET_CROSSWALK_HONESTY.lenr_proved).toBe(false);
    expect(PACKET_CROSSWALK_HONESTY.eq_open_status).toBe('OPEN');
    expect(PACKET_CROSSWALK_HONESTY.discharges_eq_open).toBe(false);
    expect(PACKET_CROSSWALK_HONESTY.raises_claim_tier).toBe(false);
    expect(PACKET_CROSSWALK_HONESTY.paper_fixed_ne_eq_open_discharge).toBe(true);
    expect(PACKET_CROSSWALK_HONESTY.mapping_is_navigation_only).toBe(true);
    expect(CROSSWALK_OPEN_EQ_IDS).toEqual(OPEN_EQ_IDS);
    OPEN_EQ_IDS.forEach((id) => {
      expect(PACKET_CROSSWALK_HONESTY.open_status[id]).toBe('OPEN');
    });
  });

  test('packets A–E present with no claim-tier raise from mapping', () => {
    expect(PACKET_CROSSWALK_ROWS).toHaveLength(5);
    expect(PACKET_CROSSWALK_ROWS.map((r) => r.packet_id)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
    expect(PACKET_CROSSWALK_HONESTY.claim_tier).toBe('speculative_exploratory');
  });

  test('legacy IL-001…018 table is complete and only stresses known OPEN ids', () => {
    expect(LEGACY_IL_TO_LEDGER).toHaveLength(18);
    expect(LEGACY_IL_TO_LEDGER[0].il_id).toBe('IL-001');
    expect(LEGACY_IL_TO_LEDGER[17].il_id).toBe('IL-018');
    LEGACY_IL_TO_LEDGER.forEach((row) => {
      row.eq_open_ids.forEach((oid) => {
        expect(OPEN_EQ_IDS).toContain(oid);
      });
    });
  });

  test('packet EQ-OPEN stresses stay within OPEN set', () => {
    PACKET_CROSSWALK_ROWS.forEach((row) => {
      row.eq_open_ids.forEach((oid) => {
        expect(OPEN_EQ_IDS).toContain(oid);
      });
    });
    const stressed = new Set(
      PACKET_CROSSWALK_ROWS.flatMap((row) => row.eq_open_ids),
    );
    OPEN_EQ_IDS.forEach((id) => {
      expect(stressed.has(id)).toBe(true);
    });
  });
});
