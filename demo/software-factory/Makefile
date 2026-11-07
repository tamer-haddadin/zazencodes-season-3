FACTORY := python3 factory/bin/factory
SANDBOX ?= /tmp/software-factory-demo

.PHONY: demo test dashboard status run next plan clean

## demo: run the sample job through the whole factory in mock mode (no API key)
demo:
	$(FACTORY) demo --sandbox $(SANDBOX)

## test: run every app's tests (what the factory gate runs)
test:
	bash factory/checks.sh

## dashboard: serve the visual board at http://localhost:8000/dashboard.html
dashboard:
	$(FACTORY) dashboard

## run: a real job with Claude Code, e.g. make run FEATURE="Add an FNOL form"
run:
	$(FACTORY) run "$(FEATURE)"

## next: build the first unchecked backlog item with Claude Code
next:
	$(FACTORY) next

## plan: print the claude commands a job would run, without running them
plan:
	$(FACTORY) plan "$(FEATURE)"

## clean: remove the demo sandbox
clean:
	rm -rf $(SANDBOX) $(SANDBOX)-factory
