import { describe, expect, it } from "vitest";
import { buildSafetyGateReportUrl, isoDateFromEuropean, parseSafetyGateAlerts, parseSafetyGateReportList } from "@/lib/safety-gate";

describe("flux officiel Safety Gate", () => {
  it("ne conserve que les rapports officiels valides", () => {
    const xml = `<?xml version="1.0"?><Safety-Gate>
      <weeklyReport><reference>Report-2026-34</reference><publicationDate>28/08/2026</publicationDate><URL>https://ec.europa.eu/safety-gate-alerts/api/download/weeklyReport/detail/xml/10000320?language=en</URL></weeklyReport>
      <weeklyReport><reference>Piège</reference><publicationDate>28/08/2026</publicationDate><URL>https://example.com/report/12</URL></weeklyReport>
    </Safety-Gate>`;
    expect(parseSafetyGateReportList(xml)).toEqual([{ reference: "Report-2026-34", publicationDate: "28/08/2026", reportId: "10000320", url: buildSafetyGateReportUrl("10000320") }]);
  });

  it("parse les champs utilisés pour une correspondance sans accepter de lien externe", () => {
    const xml = `<?xml version="1.0"?><Safety-Gate>
      <notifications><caseNumber>SR/02362/26</caseNumber><reference><![CDATA[https://ec.europa.eu/safety-gate-alerts/screen/webReport/alertDetail/10118487]]></reference><category><![CDATA[Electrical appliances]]></category><product><![CDATA[LED tree]]></product><brand><![CDATA[MICA]]></brand><type_numberOfModel>1121031</type_numberOfModel><batchNumber>B-42</batchNumber><barcode>8720362191049</barcode><riskType>Environment</riskType><level>Serious risk</level><notifyingCountry>Luxembourg</notifyingCountry><countryOfOrigin>China</countryOfOrigin><description>Decorative tree</description><danger>Excessive lead</danger></notifications>
      <notifications><caseNumber>BAD/1</caseNumber><reference>https://example.com/bad</reference></notifications>
    </Safety-Gate>`;
    expect(parseSafetyGateAlerts(xml)).toEqual([expect.objectContaining({ reference: "SR/02362/26", brand: "MICA", model: "1121031", barcode: "8720362191049", riskLevel: "Serious risk" })]);
  });

  it("convertit la date européenne sans ambiguïté", () => {
    expect(isoDateFromEuropean("28/08/2026")).toBe("2026-08-28");
  });
});
