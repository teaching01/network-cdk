#!/usr/bin/env node
import 'dotenv/config'
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { NetworkCdkStack } from '../lib/network-cdk-stack'

const AWS_ACCOUNT = process.env.AWS_ACCOUNT
const AWS_REGION = process.env.AWS_REGION

const app = new cdk.App()
new NetworkCdkStack(app, 'NetworkCdkStack', {
  env: {
    account: AWS_ACCOUNT,
    region: AWS_REGION,
  },
})
