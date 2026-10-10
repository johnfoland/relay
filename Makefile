.PHONY: check

# Everything CI checks. Run it before every push.
check:
	python3 tools/check.py
	python3 -m unittest discover -s tests
	@if command -v claude >/dev/null 2>&1; then \
		claude plugin validate . && claude plugin validate plugins/relay; \
	else \
		echo "skipped: claude plugin validate (claude is not on PATH)"; \
	fi
