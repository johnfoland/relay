.PHONY: check

# Everything CI checks. Run it before every push.
check:
	python3 tools/check.py
	python3 -m unittest discover -s tests
	@if command -v claude >/dev/null 2>&1; then \
		claude plugin validate . && claude plugin validate plugins/relay && \
		claude plugin validate plugins/relay-band && claude plugin test plugins/relay-band; \
	else \
		echo "skipped: claude plugin validate and test (claude is not on PATH)"; \
	fi
