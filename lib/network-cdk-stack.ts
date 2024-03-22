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

    // sg pub
    const sgPub = new ec2.SecurityGroup(this, `${PREFIX}-sg-pub`, {
      vpc: vpc,
      securityGroupName: `${PREFIX}-sg-pub`,
    })
    sgPub.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'allow ssh access from any ip addresses'
    )
    sgPub.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow web server access from any ip addresses'
    )

    // sg priv
    const sgPriv = new ec2.SecurityGroup(this, `${PREFIX}-sg-priv`, {
      vpc: vpc,
      securityGroupName: `${PREFIX}-sg-priv`,
    })
    sgPriv.addIngressRule(
      ec2.Peer.securityGroupId(sgPub.securityGroupId),
      ec2.Port.tcp(22),
      'allow ssh access from public subnet'
    )

    // sg intra
    const sgIntra = new ec2.SecurityGroup(this, `${PREFIX}-sg-intra`, {
      vpc: vpc,
      securityGroupName: `${PREFIX}-sg-intra`,
    })
    sgIntra.addIngressRule(
      ec2.Peer.securityGroupId(sgPriv.securityGroupId),
      ec2.Port.tcp(22),
      'allow ssh access from private subnet'
    )

    // key pair
    const keyPair = new ec2.KeyPair(this, `${PREFIX}-key-pair`, {
      keyPairName: `${PREFIX}-key-pair`,
    })

    // ec2 pub
    const ec2Pub = new ec2.Instance(this, `${PREFIX}-ec2-pub`, {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
      }),
      keyPair: keyPair,
      vpc: vpc,
      vpcSubnets: { subnets: [subnetPub] },
      securityGroup: sgPub,
    })

    new ec2.CfnEIP(this, `${PREFIX}-eip-pub`, {
      tags: [{ key: 'Name', value: PREFIX }],
      instanceId: ec2Pub.instanceId,
    })

    // ec2 priv
    const ec2Priv = new ec2.Instance(this, `${PREFIX}-ec2-priv`, {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
      }),
      keyPair: keyPair,
      vpc: vpc,
      vpcSubnets: { subnets: [subnetPriv] },
      securityGroup: sgPriv,
    })

    // ec2 intra
    const ec2Intra = new ec2.Instance(this, `${PREFIX}-ec2-intra`, {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
      }),
      keyPair: keyPair,
      vpc: vpc,
      vpcSubnets: { subnets: [subnetIntra] },
      securityGroup: sgIntra,
    })

    // outputs
    const keyName = `${PREFIX}.pem`
    new cdk.CfnOutput(this, `${PREFIX}-get-key-pair`, {
      value: `aws ssm get-parameter \
      --name /ec2/keypair/${keyPair.keyPairId} \
      --region ${this.region} \
      --with-decryption \
      --query Parameter.Value \
      --output text > ${keyName} & chmod 600 ${keyName}`,
    })

    new cdk.CfnOutput(this, `${PREFIX}-ssh-pub`, {
      value: `ssh -i ${keyName} ec2-user@${ec2Pub.instancePublicIp}`,
    })

    new cdk.CfnOutput(this, `${PREFIX}-ssh-priv`, {
      value: `ssh -i ${keyName} \
      -o ProxyCommand='ssh -i ${keyName} -W %h:%p ec2-user@${ec2Pub.instancePublicIp}' \
      ec2-user@${ec2Priv.instancePrivateIp}`,
    })

    new cdk.CfnOutput(this, `${PREFIX}-sftp-priv`, {
      value: `sftp -i ${keyName} \
      -o ProxyCommand='ssh -i ${keyName} -W %h:%p ec2-user@${ec2Pub.instancePublicIp}' \
      ec2-user@${ec2Priv.instancePrivateIp}`,
    })
  }
}
