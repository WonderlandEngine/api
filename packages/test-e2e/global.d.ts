declare module Chai {
    interface AlmostEqual {
        (value: any, tolerance?: number | null, message?: string): Assertion;
    }
    interface Assertion {
        almost: AlmostEqual;
    }
    interface Deep {
        almost: AlmostEqual;
    }
}
