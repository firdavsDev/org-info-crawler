BOT_NAME = "orginfo"

ROBOTSTXT_OBEY = True

DOWNLOAD_DELAY = 2
RANDOMIZE_DOWNLOAD_DELAY = True

CONCURRENT_REQUESTS = 2
CONCURRENT_REQUESTS_PER_DOMAIN = 2

RETRY_TIMES = 5

AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 2
AUTOTHROTTLE_MAX_DELAY = 10

DOWNLOADER_MIDDLEWARES = {
    "scrapy.downloadermiddlewares.retry.RetryMiddleware": 550,
    "scrapy.downloadermiddlewares.useragent.UserAgentMiddleware": None,
    "crawler.middlewares.RotateUserAgentMiddleware": 400,
}
