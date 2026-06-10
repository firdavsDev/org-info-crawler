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
        # normalise non-breaking spaces so it is usable.
        charter_raw = row_value("Ustav fondi")
        charter_fund = charter_raw.replace("\u00a0", " ") if charter_raw else None

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
        }
