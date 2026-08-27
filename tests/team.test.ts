import { describe, expect, it } from "vitest";
import { assignableTeamRoles, personInitials, teamRoleCopy } from "@/lib/team";

describe("team roles", () => {
  it("keeps ownership outside assignable invitation roles", () => {
    expect(assignableTeamRoles).toEqual(["admin", "editor", "reviewer", "viewer"]);
    expect(assignableTeamRoles).not.toContain("owner");
  });

  it("provides a clear label and description for every role", () => {
    expect(Object.keys(teamRoleCopy)).toEqual(["owner", "admin", "editor", "reviewer", "viewer"]);
    for (const copy of Object.values(teamRoleCopy)) {
      expect(copy.label.length).toBeGreaterThan(3);
      expect(copy.description.length).toBeGreaterThan(20);
    }
  });
});

describe("personInitials", () => {
  it("uses at most the first two words", () => {
    expect(personInitials("Hugo Dias Silva")).toBe("HD");
    expect(personInitials("Sofia")).toBe("S");
    expect(personInitials("   ")).toBe("EU");
  });
});
