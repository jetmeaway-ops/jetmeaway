const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, ExternalHyperlink, LevelFormat,
} = require("docx");

const BLUE = "0066FF";
const DARK = "1A1D2B";
const GREY = "5C6378";
const LIGHT_BLUE = "E8F0FE";
const WHITE = "FFFFFF";
const TABLE_BORDER = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const BORDERS = { top: TABLE_BORDER, bottom: TABLE_BORDER, left: TABLE_BORDER, right: TABLE_BORDER };
const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };

// A4 dimensions
const PAGE_WIDTH = 11906;
const MARGINS = { top: 1440, right: 1200, bottom: 1440, left: 1200 };
const CONTENT_WIDTH = PAGE_WIDTH - MARGINS.left - MARGINS.right;

function headerCell(text, width) {
  return new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: BLUE, type: ShadingType.CLEAR },
    margins: CELL_MARGINS,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, font: "Arial", size: 20 })] })],
  });
}

function cell(text, width, opts = {}) {
  return new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    margins: CELL_MARGINS,
    children: [new Paragraph({
      children: [new TextRun({ text, font: "Arial", size: 20, bold: opts.bold || false, color: opts.color || DARK })],
    })],
  });
}

function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths[i])) }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((c, i) =>
            cell(c, colWidths[i], { shading: ri % 2 === 1 ? "F5F7FA" : undefined })
          ),
        })
      ),
    ],
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 300, after: 200 }, children: [new TextRun({ text, font: "Arial", bold: true, color: level === HeadingLevel.HEADING_1 ? BLUE : DARK })] });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [new TextRun({ text, font: "Arial", size: opts.size || 22, color: opts.color || GREY, bold: opts.bold || false, italics: opts.italic || false })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 100 }, children: [] });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 280, after: 180 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    // ═══════════════════════════════════════════════════════════════
    // COVER PAGE
    // ═══════════════════════════════════════════════════════════════
    {
      properties: {
        page: { size: { width: PAGE_WIDTH, height: 16838 }, margin: MARGINS },
      },
      headers: {
        default: new Header({ children: [new Paragraph({ children: [] })] }),
      },
      children: [
        spacer(), spacer(), spacer(), spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "BUSINESS PLAN", font: "Arial", size: 52, bold: true, color: BLUE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: "JetMeAway", font: "Arial", size: 72, bold: true, color: DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "Your Trusted Travel Comparison Engine", font: "Arial", size: 28, color: GREY, italics: true })],
        }),
        spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "jetmeaway.co.uk", font: "Arial", size: 24, color: BLUE, bold: true })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "waqar@jetmeaway.co.uk", font: "Arial", size: 22, color: GREY })] }),
        spacer(), spacer(), spacer(), spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Prepared by: Waqarul Hassan Sabir", font: "Arial", size: 22, color: DARK, bold: true })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Date: April 2026", font: "Arial", size: 22, color: GREY })] }),
        spacer(), spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CONFIDENTIAL", font: "Arial", size: 20, bold: true, color: "CC0000" })] }),
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // MAIN CONTENT
    // ═══════════════════════════════════════════════════════════════
    {
      properties: {
        page: { size: { width: PAGE_WIDTH, height: 16838 }, margin: MARGINS },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
            children: [
              new TextRun({ text: "JetMeAway \u2014 Business Plan", font: "Arial", size: 18, color: GREY }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 } },
            children: [
              new TextRun({ text: "Page ", font: "Arial", size: 18, color: GREY }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: GREY }),
              new TextRun({ text: " | jetmeaway.co.uk | Confidential", font: "Arial", size: 18, color: GREY }),
            ],
          })],
        }),
      },
      children: [
        // ─── 1. EXECUTIVE SUMMARY ────────────────────────────────
        heading("1. Executive Summary"),
        para("JetMeAway (jetmeaway.co.uk) is a UK-based online travel comparison engine that compares flights, hotels, car hire, holiday packages, travel insurance, and eSIM data plans across 10+ trusted providers. Customers see the cheapest price instantly and book directly with the provider."),
        para("The platform is live, fully operational, and serves UK leisure travellers. Revenue is currently generated through affiliate commissions from partners including Expedia, Trip.com, Booking.com, Travelpayouts, Klook, and others."),
        para("We are seeking to join an umbrella ATOL provider to add direct package booking capability alongside our existing affiliate comparison model. This will enable us to offer ATOL-protected holiday packages directly on our site, increasing revenue from 1\u20133% affiliate commission to 8\u201315% direct booking commission."),

        // ─── 2. COMPANY OVERVIEW ─────────────────────────────────
        heading("2. Company Overview"),

        makeTable(
          ["Detail", "Information"],
          [
            ["Business Name", "JetMeAway"],
            ["Website", "jetmeaway.co.uk"],
            ["Type", "Online travel comparison engine + direct booking"],
            ["Founder", "Waqarul Hassan Sabir"],
            ["Contact", "waqar@jetmeaway.co.uk"],
            ["Location", "Home-based, United Kingdom"],
            ["Staff", "Founder only (technology automates operations)"],
            ["Helpline", "Twilio UK business number with automated IVR (English + Urdu)"],
          ],
          [3500, CONTENT_WIDTH - 3500]
        ),

        // ─── 3. TRAVEL MARKET POSITION ───────────────────────────
        heading("3. Travel Market Position"),
        heading("3.1 Company Type", HeadingLevel.HEADING_2),
        para("JetMeAway operates as a Tour Organiser \u2014 we pull together travel services from multiple suppliers and present them to consumers via our website. We dynamically source options from multiple providers and let customers compare and book. We also act as a digital Retail Agent \u2014 our website is the retail front where customers find and access travel products."),

        heading("3.2 Market Sector", HeadingLevel.HEADING_2),
        para("Primary: Mass market UK leisure travel \u2014 flights, hotels, car hire, packages."),
        para("Secondary: Niche markets \u2014 British-Pakistani diaspora (Lahore, Islamabad, Karachi routes), eSIM data plans, travel insurance comparison."),

        heading("3.3 Business Type: Tailored with Niche Elements", HeadingLevel.HEADING_2),
        para("JetMeAway is not a scale business \u2014 we cannot compete with TUI or Booking.com on volume. Instead, we compete through tailoring: comparing across 6+ providers per category, showing the cheapest option instantly. We also have niche elements, serving UK travellers specifically (18 UK departure airports, GBP pricing, geolocation to nearest airport) and the British-Pakistani community with dedicated routes and Urdu language support."),

        heading("3.4 Not a \u201CMe Too\u201D Business", HeadingLevel.HEADING_2),
        para("JetMeAway is differentiated from existing comparison sites in several key ways:"),

        makeTable(
          ["Differentiator Question", "Answer"],
          [
            ["Appeals to specific customer type?", "Yes \u2014 UK travellers wanting all-in-one comparison + British-Pakistani diaspora"],
            ["Utilises rare services?", "Yes \u2014 eSIM comparison + insurance comparison alongside travel"],
            ["Access to specific customers?", "Yes \u2014 growing online audience, UK-focused with geolocation"],
            ["Only company providing this?", "Yes \u2014 no UK site combines 6 travel categories in one platform"],
            ["Personal knowledge of market?", "Yes \u2014 founder is frequent traveller + developer who built entire platform"],
            ["Specific demographic appeal?", "Yes \u2014 UK leisure travellers, families, British-Pakistani community"],
            ["Access to expertise?", "Yes \u2014 curated guides, automated alerts, personal support"],
          ],
          [4000, CONTENT_WIDTH - 4000]
        ),

        spacer(),
        para("Result: Not a me too business. Six out of seven differentiator questions answered positively."),

        // ─── 4. CUSTOMER PROPOSITION ─────────────────────────────
        heading("4. Customer Proposition"),
        para("JetMeAway compares flights, hotels, car hire, packages, insurance, and eSIM plans across 10+ trusted providers \u2014 all in one place, with no markups and no booking fees. Customers see the cheapest price instantly and book directly with the provider.", { bold: true, color: DARK }),
        spacer(),
        para("Three core differentiators:"),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "All-in-one comparison \u2014 most sites compare one category (Skyscanner = flights, Trivago = hotels). JetMeAway compares everything a traveller needs in a single journey.", font: "Arial", size: 22, color: GREY })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Transparency \u2014 we show which provider is cheapest with clear pricing. No hidden fees. Revenue comes from affiliate commissions, not customer markups.", font: "Arial", size: 22, color: GREY })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 160 }, children: [new TextRun({ text: "Technology-first \u2014 built by a developer, not a traditional travel agent. Live API searches, real-time price comparison, modern user experience.", font: "Arial", size: 22, color: GREY })] }),

        // ─── 5. COMPETITIVE ANALYSIS ─────────────────────────────
        heading("5. Competitive Analysis"),

        makeTable(
          ["Competitor", "What They Do", "JetMeAway Advantage"],
          [
            ["Skyscanner", "Compares flights only", "We compare all 6 travel categories"],
            ["Trivago", "Compares hotels only", "We add flights, cars, packages, insurance, eSIM"],
            ["Kayak", "Flights + hotels", "We add cars, packages, insurance, eSIM + direct booking"],
            ["TravelSupermarket", "Compares packages", "Modern UX, more categories, more providers"],
            ["Google Flights", "Flight search", "No hotel/car/package/insurance comparison"],
          ],
          [2500, 3000, CONTENT_WIDTH - 5500]
        ),

        spacer(),
        para("No UK site combines all six travel categories (flights, hotels, cars, packages, insurance, eSIM) with both affiliate comparison AND direct booking capability."),

        // ─── 6. HOW THE BUSINESS OPERATES ────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        heading("6. How the Business Operates"),

        heading("6.1 Current Model (Affiliate Comparison)", HeadingLevel.HEADING_2),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Customer visits jetmeaway.co.uk", font: "Arial", size: 22, color: GREY })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Searches for flights, hotels, cars, packages, insurance, or eSIM", font: "Arial", size: 22, color: GREY })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Platform queries live APIs and displays prices from multiple providers", font: "Arial", size: 22, color: GREY })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Customer clicks through to cheapest provider to book", font: "Arial", size: 22, color: GREY })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 160 }, children: [new TextRun({ text: "JetMeAway earns affiliate commission (1\u20135%)", font: "Arial", size: 22, color: GREY })] }),

        heading("6.2 Proposed Model (Hybrid \u2014 Affiliate + Direct Booking)", HeadingLevel.HEADING_2),
        para("All existing affiliate comparison continues unchanged. A new \u201CBook with JetMeAway\u201D option is added for package bookings, processed through the umbrella ATOL provider\u2019s systems. Customers receive an ATOL certificate under the umbrella\u2019s licence. JetMeAway earns direct commission of 8\u201315%. Customers always retain the choice to book via affiliate partners \u2014 we show all options transparently."),

        // ─── 7. REVENUE STREAMS ──────────────────────────────────
        heading("7. Revenue Streams"),

        makeTable(
          ["Stream", "Type", "Commission", "Status"],
          [
            ["Flight comparison", "Affiliate (Travelpayouts)", "1\u20133%", "Active"],
            ["Hotel comparison", "Affiliate (RateHawk)", "5%", "Pending API"],
            ["Hotel direct booking", "Direct (LiteAPI/Nuitee)", "Markup-based", "Active"],
            ["Car hire comparison", "Affiliate (multiple)", "2\u20135%", "Active"],
            ["Package comparison", "Affiliate (Expedia, Trip.com)", "2\u20134%", "Active"],
            ["Package direct booking", "Direct (via umbrella ATOL)", "8\u201315%", "Proposed"],
            ["Insurance comparison", "Affiliate", "5\u201310%", "Active"],
            ["eSIM comparison", "Affiliate", "5\u20138%", "Active"],
          ],
          [2200, 2800, 1800, CONTENT_WIDTH - 6800]
        ),

        // ─── 8. SUPPLIERS & PARTNERS ─────────────────────────────
        heading("8. Suppliers & Partners"),

        makeTable(
          ["Partner", "Relationship", "Products"],
          [
            ["Travelpayouts", "Affiliate network", "Flights, cars"],
            ["Expedia", "Affiliate", "Flights, hotels, packages, cars"],
            ["Trip.com", "Affiliate", "Flights, hotels, packages, cars"],
            ["Booking.com", "Affiliate", "Hotels"],
            ["Klook", "Affiliate", "Packages, cars, activities"],
            ["LiteAPI / Nuitee", "Direct API", "Hotel bookings (2.9M+ properties)"],
            ["RateHawk", "Affiliate API (pending)", "Hotel comparison"],
            ["Airalo / Yesim / Holafly", "Affiliate", "eSIM data plans"],
            ["Umbrella ATOL Provider", "ATOL partner", "Packages \u2014 proposed"],
          ],
          [2500, 2500, CONTENT_WIDTH - 5000]
        ),

        // ─── 9. TARGET MARKET ────────────────────────────────────
        heading("9. Target Market"),

        heading("Primary", HeadingLevel.HEADING_3),
        para("UK leisure travellers aged 25\u201355 planning holidays abroad \u2014 families comparing prices, budget-conscious travellers, and couples planning breaks."),

        heading("Secondary", HeadingLevel.HEADING_3),
        para("British-Pakistani diaspora \u2014 flights to Lahore, Islamabad, Karachi; multi-generational family travel (6+ passengers); Urdu-speaking customer support via phone helpline."),

        heading("Tertiary", HeadingLevel.HEADING_3),
        para("Tech-savvy travellers who prefer comparison tools over high-street agents, value transparency, and use digital services like eSIM and online insurance."),

        // ─── 10. MARKETING STRATEGY ──────────────────────────────
        heading("10. Marketing Strategy"),

        makeTable(
          ["Channel", "Approach", "Cost"],
          [
            ["SEO", "Optimised pages for destination-specific searches", "Free"],
            ["Social Media", "Instagram, Facebook, TikTok \u2014 destination content, deal alerts", "Free"],
            ["Deal Alerts", "Email subscribers receive curated deals", "Free"],
            ["Word of Mouth", "Community referrals, British-Pakistani networks", "Free"],
            ["Google Ads", "Targeted PPC when budget allows", "Future"],
          ],
          [2000, 4500, CONTENT_WIDTH - 6500]
        ),

        spacer(),
        para("Current marketing cost: \u00A30/month. Growth is organic through SEO and social sharing."),

        // ─── 11. TECHNOLOGY ──────────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        heading("11. Technology Stack"),
        para("All technology is built and maintained by the founder. No third-party agencies. This keeps operating costs near zero and allows rapid iteration."),

        makeTable(
          ["Component", "Technology"],
          [
            ["Website", "Next.js 16, React 19, TypeScript"],
            ["Hosting", "Vercel Edge Functions (global CDN)"],
            ["Database", "Vercel KV (Redis)"],
            ["Payment (hotels)", "LiteAPI Payment SDK (Nuitee)"],
            ["Flight search", "Travelpayouts / Aviasales API"],
            ["Hotel search", "LiteAPI + RateHawk (pending)"],
            ["SMS notifications", "Twilio"],
            ["Phone helpline", "Twilio IVR (English + Urdu)"],
            ["Email", "Custom domain email"],
          ],
          [3500, CONTENT_WIDTH - 3500]
        ),

        // ─── 12. FINANCIALS ──────────────────────────────────────
        heading("12. Financial Projections"),

        heading("12.1 Startup Costs (Already Incurred)", HeadingLevel.HEADING_2),
        makeTable(
          ["Item", "Cost"],
          [
            ["Domain (jetmeaway.co.uk)", "\u00A310/year"],
            ["Vercel hosting", "Free tier"],
            ["Twilio phone + SMS", "\u00A35/month"],
            ["LiteAPI", "Free tier (pay per booking)"],
            ["Development", "\u00A30 (built by founder)"],
            ["Total startup to date", "\u00A325"],
          ],
          [5000, CONTENT_WIDTH - 5000]
        ),

        spacer(),
        heading("12.2 Ongoing Monthly Costs", HeadingLevel.HEADING_2),
        makeTable(
          ["Item", "Monthly Cost"],
          [
            ["Vercel hosting", "\u00A30"],
            ["Twilio (phone + SMS)", "\u00A35"],
            ["Domain renewal", "\u00A31"],
            ["Umbrella ATOL membership", "\u00A3100\u2013200 (est.)"],
            ["Total monthly", "\u00A3110\u2013210"],
          ],
          [5000, CONTENT_WIDTH - 5000]
        ),

        spacer(),
        heading("12.3 Revenue Projections (Year 1 with ATOL)", HeadingLevel.HEADING_2),

        makeTable(
          ["Period", "Affiliate Revenue", "Direct Bookings", "Package Commission (10%)", "Monthly Total"],
          [
            ["Month 1\u20133", "\u00A350/month", "2 \u00D7 \u00A31,500", "\u00A3300/month", "\u00A3350/month"],
            ["Month 4\u20136", "\u00A3100/month", "5 \u00D7 \u00A31,500", "\u00A3750/month", "\u00A3850/month"],
            ["Month 7\u20139", "\u00A3150/month", "8 \u00D7 \u00A32,000", "\u00A31,600/month", "\u00A31,750/month"],
            ["Month 10\u201312", "\u00A3200/month", "12 \u00D7 \u00A32,000", "\u00A32,400/month", "\u00A32,600/month"],
          ],
          [1600, 1800, 1800, 2200, CONTENT_WIDTH - 7400]
        ),

        spacer(),
        para("Year 1 total estimated revenue: \u00A316,500", { bold: true, color: DARK }),
        para("Year 1 total estimated costs: \u00A32,500", { bold: true, color: DARK }),
        para("Year 1 estimated profit: \u00A314,000", { bold: true, color: BLUE }),

        heading("12.4 Break-Even Analysis", HeadingLevel.HEADING_2),
        para("Monthly costs with umbrella ATOL: approximately \u00A3150. Average package commission per booking: \u00A3150\u2013200. Break-even point: 1 direct booking per month."),

        heading("12.5 Growth Projections (Years 2\u20133)", HeadingLevel.HEADING_2),

        makeTable(
          ["Year", "Monthly Bookings", "Avg Value", "Monthly Revenue", "Annual Revenue"],
          [
            ["Year 2", "20\u201330", "\u00A32,000", "\u00A34,000\u20136,000", "\u00A348,000\u201372,000"],
            ["Year 3", "40\u201360", "\u00A32,500", "\u00A310,000\u201315,000", "\u00A3120,000\u2013180,000"],
          ],
          [1400, 1800, 1600, 2100, CONTENT_WIDTH - 6900]
        ),

        spacer(),
        para("At Year 3 volume, JetMeAway would have sufficient trading history and turnover to apply for its own PTS/ATOL licence."),

        // ─── 13. LEGAL & COMPLIANCE ──────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        heading("13. Legal & Compliance"),

        makeTable(
          ["Requirement", "Status"],
          [
            ["ATOL (flight-inclusive packages)", "To be provided by umbrella ATOL partner"],
            ["GDPR / Privacy Policy", "Published at jetmeaway.co.uk/privacy"],
            ["Terms & Conditions", "Published at jetmeaway.co.uk/terms"],
            ["Affiliate disclosure", "Displayed in footer and terms page"],
            ["Data storage", "Vercel KV (EU region), GDPR compliant"],
            ["PCI DSS (card payments)", "Handled by payment SDK \u2014 card data never touches our servers"],
            ["Professional indemnity insurance", "To be arranged"],
            ["Consumer Rights Act 2015", "Full compliance"],
            ["PTR 2018 (Package Travel Regs)", "Compliance via umbrella ATOL"],
          ],
          [4000, CONTENT_WIDTH - 4000]
        ),

        // ─── 14. RISK ASSESSMENT ─────────────────────────────────
        heading("14. Risk Assessment"),

        makeTable(
          ["Risk", "Likelihood", "Impact", "Mitigation"],
          [
            ["Low booking volume initially", "Medium", "Low", "Affiliate revenue covers costs. Break-even is 1 booking/month"],
            ["Supplier API downtime", "Low", "Medium", "Multiple suppliers per category. Cached fallback data"],
            ["Customer complaints", "Medium", "Medium", "Clear T&Cs, umbrella handles disputes, professional IVR helpline"],
            ["Regulatory changes", "Medium", "High", "Already compliant via umbrella ATOL. Monitor CAA updates"],
            ["Competition from larger sites", "High", "Low", "Niche positioning, all-in-one proposition"],
            ["Founder unavailability", "Low", "High", "Automated platform runs independently. IVR handles calls"],
          ],
          [2200, 1200, 1000, CONTENT_WIDTH - 4400]
        ),

        // ─── 15. WHY WE WANT TO JOIN ─────────────────────────────
        heading("15. Why We Want to Join an Umbrella ATOL"),
        para("JetMeAway currently operates as a comparison/affiliate engine \u2014 customers search, compare, and click through to partner sites to book. This model works but has a key limitation: we lose the customer at the point of booking."),
        para("By joining an umbrella ATOL provider, we can:"),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Add \u201CBook with JetMeAway\u201D as an option alongside affiliate links", font: "Arial", size: 22, color: GREY })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Offer ATOL-protected packages directly on our site", font: "Arial", size: 22, color: GREY })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Increase revenue from 1\u20133% affiliate to 8\u201315% direct commission", font: "Arial", size: 22, color: GREY })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Improve customer experience with seamless search-to-booking journey", font: "Arial", size: 22, color: GREY })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Build trust \u2014 ATOL protection badge signals legitimacy to UK consumers", font: "Arial", size: 22, color: GREY })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 160 }, children: [new TextRun({ text: "Maintain hybrid model \u2014 affiliate + direct bookings reduces risk", font: "Arial", size: 22, color: GREY })] }),

        // ─── 16. GROWTH ROADMAP ──────────────────────────────────
        heading("16. Growth Roadmap"),

        makeTable(
          ["Phase", "Timeline", "Milestone"],
          [
            ["Phase 1", "Now", "Affiliate comparison engine (live and operational)"],
            ["Phase 2", "2026", "Join umbrella ATOL \u2014 add direct package bookings"],
            ["Phase 3", "2026\u20132027", "Scale to 30\u201350 direct bookings/month"],
            ["Phase 4", "2028+", "Apply for own PTS/ATOL licence with 2+ years trading history"],
          ],
          [1500, 1500, CONTENT_WIDTH - 3000]
        ),

        spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: "\u2014 End of Business Plan \u2014", font: "Arial", size: 22, color: GREY, italics: true })],
        }),

        spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "For enquiries: waqar@jetmeaway.co.uk | jetmeaway.co.uk", font: "Arial", size: 20, color: BLUE })],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("JetMeAway-Business-Plan.docx", buffer);
  console.log("Created: JetMeAway-Business-Plan.docx");
});
