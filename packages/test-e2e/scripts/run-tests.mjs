#!/usr/bin/env node

import {startTestRunner} from '@web/test-runner';

/* This is required to prevent web-test-runner to parse
 * the cli arguments, leading to errors with `--grep` and `--deploy`. */
startTestRunner({readCliArgs: false});
