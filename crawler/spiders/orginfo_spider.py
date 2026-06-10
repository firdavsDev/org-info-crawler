import scrapy
from selectolax.parser import HTMLParser


class OrgSpider(scrapy.Spider):
    name = "orginfo"

    def __init__(self, tin=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.start_urls = [f"https://orginfo.uz/uz/search/organizations/?q={tin}"]
        self.tin = tin

    def parse(self, response):
        link = response.css("a.og-card::attr(href)").get()

        if not link:
            self.logger.warning("No org-card link found for TIN %s", self.tin)
            return

        yield response.follow(link, self.parse_detail)

    def parse_detail(self, response):
        html = HTMLParser(response.text)

        def text(css):
            el = html.css_first(css)
            return el.text(strip=True) if el else None

        def row_value(label_text: str):
            """Return the value-column text from a card-body label/value row."""
            for row in html.css("div.row.border-bottom, div.row.pt-3"):
                label_el = row.css_first("div.col-6.text-body-tertiary span")
                if label_el and label_el.text(strip=True) == label_text:
                    value_el = row.css_first("div.col-6:last-child")
                    if value_el:
                        return " ".join(value_el.text(strip=True).split())
            return None

        # charter_fund raw looks like "84\u00a0631\u00a0471\u00a0400,00 UZS"
        charter_raw = row_value("Ustav fondi")
        charter_fund = charter_raw.replace("\u00a0", " ") if charter_raw else None

        # ── Contact block (Kontakt ma'lumotlar) ──────────────────────────────
        # email / phone already parsed via itemprop; address spans may be
        # inside a <address> tag which the existing text() calls already cover.
        address_locality = text("[itemprop=addressLocality]")
        street_address   = text("[itemprop=streetAddress]")
        if address_locality and street_address:
            full_address = f"{address_locality}, {street_address}"
        elif address_locality or street_address:
            full_address = address_locality or street_address
        else:
            full_address = None

        # ── Management block (Boshqaruv ma'lumotlari) ────────────────────────
        director = None
        for card in html.css("div.card-body"):
            h2 = card.css_first("h2.h5")
            if h2 and "Boshqaruv" in h2.text():
                # The value column of the "Rahbar" row
                for row in card.css("div.row"):
                    label_el = row.css_first("div.col-6.text-body-tertiary span")
                    if label_el and "Rahbar" in label_el.text():
                        val_el = row.css_first("div.col-6:last-child span")
                        if val_el:
                            director = val_el.text(strip=True)
                        break
                break

        # ── Founders block (Ta'sischilar) ─────────────────────────────────────
        founders = []
        for card in html.css("div.card-body"):
            h2 = card.css_first("h2.h5")
            if h2 and "Ta'sischilar" in h2.text():
                for row in card.css("div.row.py-2"):
                    name_el  = row.css_first("a span")
                    share_el = row.css_first("[itemprop=percentOwnership]")
                    if name_el:
                        founders.append({
                            "name":  name_el.text(strip=True),
                            "share": share_el.attrs.get("content") if share_el else None,
                        })
                break

        yield {
            "tin": self.tin,
            "name": text("h1[itemprop=name]"),
            "legal_name": text("[itemprop=legalName]"),
            "alternate_name": text("[itemprop=alternateName]"),
            "founding_date": text("[itemprop=foundingDate]"),
            "status": text("[itemprop=status]"),
            "registration_authority": row_value("Ro'yxatdan o'tkazuvchi organ"),
            "thsht": row_value("THSHT"),
            "dbibt": row_value("DBIBT"),
            "ifut": row_value("IFUT"),
            "charter_fund": charter_fund,
            "email": text("a[itemprop=email]"),
            "phone": text("a[itemprop=telephone]"),
            "address": full_address,
            "director": director,
            "founders": founders if founders else None,
        }
