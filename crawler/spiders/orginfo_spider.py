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

        yield response.follow(link, self.parse_detail)

    def parse_detail(self, response):
        html = HTMLParser(response.text)

        def text(css):
            el = html.css_first(css)
            return el.text(strip=True) if el else None

        yield {
            "tin": self.tin,
            "name": text("h1[itemprop=name]"),
            "legal_name": text("[itemprop=legalName]"),
            "status": text("[itemprop=status]"),
            "email": text("a[itemprop=email]"),
            "phone": text("a[itemprop=telephone]"),
        }
