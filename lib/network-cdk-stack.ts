import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'

const PREFIX = 'network-cdk'

export class NetworkCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // vpc
    const vpc = new ec2.Vpc(this, `${PREFIX}-vpc`, {
      ipAddresses: ec2.IpAddresses.cidr('192.168.0.0/16'),
      vpcName: `${PREFIX}-vpc`,
      availabilityZones: [`${this.region}a`],
      subnetConfiguration: [],
      createInternetGateway: false,
    })
  }
}
