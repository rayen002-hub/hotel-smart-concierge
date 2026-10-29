import { getBusinessDay } from "../src/utils/businessDay";
import { getHotelTimeZone, hotelCalendarDate } from "../src/utils/hotelDate";

describe("authoritative hotel timezone", () => {
  it("always uses Africa/Tunis even if the server TZ variable differs", () => {
    const original = process.env.TZ;
    process.env.TZ = "Asia/Tokyo";
    try {
      expect(getHotelTimeZone()).toBe("Africa/Tunis");
      expect(hotelCalendarDate(new Date("2026-10-30T22:30:00.000Z"))).toBe("2026-10-30");
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it("applies the 06:00 business-day boundary in Tunisia time", () => {
    const beforeBoundary = getBusinessDay(new Date("2026-10-30T04:59:00.000Z")); // 05:59 Tunisia
    const atBoundary = getBusinessDay(new Date("2026-10-30T05:00:00.000Z")); // 06:00 Tunisia

    expect(beforeBoundary.toISOString()).toBe("2026-10-29T00:00:00.000Z");
    expect(atBoundary.toISOString()).toBe("2026-10-30T00:00:00.000Z");
  });
});
