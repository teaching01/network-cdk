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

    // subnets
    const subnetPub = new ec2.Subnet(this, `${PREFIX}-subnet-pub`, {
      vpcId: vpc.vpcId,
      cidrBlock: '192.168.0.0/24',
      availabilityZone: `${this.region}a`,
    })
    const subnetPriv = new ec2.Subnet(this, `${PREFIX}-subnet-priv`, {
      vpcId: vpc.vpcId,
      cidrBlock: '192.168.1.0/24',
      availabilityZone: `${this.region}a`,
    })
    const subnetIntra = new ec2.Subnet(this, `${PREFIX}-subnet-intra`, {
      vpcId: vpc.vpcId,
      cidrBlock: '192.168.2.0/24',
      availabilityZone: `${this.region}a`,
    })

    // igw
    const igw = new ec2.CfnInternetGateway(this, `${PREFIX}-igw`, {
      tags: [{ key: 'Name', value: PREFIX }],
    })
    new ec2.CfnVPCGatewayAttachment(this, `${PREFIX}-igw-attachment`, {
      vpcId: vpc.vpcId,
      internetGatewayId: igw.attrInternetGatewayId,
    })

    // ngw
    const eip = new ec2.CfnEIP(this, `${PREFIX}-eip`, {
      tags: [{ key: 'Name', value: PREFIX }],
    })
    const ngw = new ec2.CfnNatGateway(this, `${PREFIX}-ngw`, {
      subnetId: subnetPub.subnetId,
      allocationId: eip.attrAllocationId,
      tags: [{ key: 'Name', value: PREFIX }],
    })

    // route table pub
    const routeTablePub = new ec2.CfnRouteTable(
      this,
      `${PREFIX}-route-table-pub`,
      {
        vpcId: vpc.vpcId,
        tags: [{ key: 'Name', value: PREFIX }],
      }
    )
    new ec2.CfnRoute(this, `${PREFIX}-route-pub`, {
      routeTableId: routeTablePub.attrRouteTableId,
      destinationCidrBlock: '0.0.0.0/0',
      gatewayId: igw.attrInternetGatewayId,
    })
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      `${PREFIX}-route-table-association-pub`,
      {
        routeTableId: routeTablePub.attrRouteTableId,
        subnetId: subnetPub.subnetId,
      }
    )

    // route table priv
    const routeTablePriv = new ec2.CfnRouteTable(
      this,
      `${PREFIX}-route-table-priv`,
      {
        vpcId: vpc.vpcId,
        tags: [{ key: 'Name', value: PREFIX }],
      }
    )
    new ec2.CfnRoute(this, `${PREFIX}-route-priv`, {
      routeTableId: routeTablePriv.attrRouteTableId,
      destinationCidrBlock: '0.0.0.0/0',
      natGatewayId: ngw.attrNatGatewayId,
    })
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      `${PREFIX}-route-table-association-priv`,
      {
        routeTableId: routeTablePriv.attrRouteTableId,
        subnetId: subnetPriv.subnetId,
      }
    )

    // acl
    const acl = new ec2.CfnNetworkAcl(this, `${PREFIX}-acl`, {
      vpcId: vpc.vpcId,
      tags: [{ key: 'Name', value: PREFIX }],
    })
    new ec2.CfnSubnetNetworkAclAssociation(
      this,
      `${PREFIX}-acl-association-pub`,
      {
        networkAclId: acl.attrId,
        subnetId: subnetPub.subnetId,
      }
    )
    new ec2.CfnNetworkAclEntry(this, `${PREFIX}-acl-entry-inbound`, {
      networkAclId: acl.attrId,
      ruleNumber: 100,
      protocol: -1,
      cidrBlock: '0.0.0.0/0',
      ruleAction: 'allow',
      egress: false,
    })
    new ec2.CfnNetworkAclEntry(this, `${PREFIX}-acl-entry-outbound`, {
      networkAclId: acl.attrId,
      ruleNumber: 100,
      protocol: -1,
      cidrBlock: '0.0.0.0/0',
      ruleAction: 'allow',
      egress: true,
    })
  }
}
