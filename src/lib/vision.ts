/** Client-safe Vision types. */

export interface VisionMobile {
  locationId: string;
  locationName: string;
  cut: number;
  notCut: number;
  cutRate: number; // 0..100
}

export interface VisionSummary {
  from: string;
  to: string;
  mobiles: VisionMobile[];
  totals: { cut: number; notCut: number; cutRate: number };
}
