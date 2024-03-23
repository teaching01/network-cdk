# AWSネットワーク・CDK入門


## 概要
- このリポジトリは、AWSネットワーク・CDK入門コース用です

## 前提条件
- node.js 20系を使っていること
- 実際にはnode.js 20.9.0を利用して作成しました

## cdkのインストール
- もしaws cdkがインストールされていない場合、cdkをインストールする必要があります
```
npm install -g aws-cdk
```
- cdkのバージョンは、2.128.0を利用しています
- もしcdkのバージョンが異なってうまく動かない場合、
- cdkを一度アンインストールして、バージョンを指定してインストールし直してみてください
```
npm uninstall -g aws-cdk
npm install -g aws-cdk@2.128.0
```

## レッスンを受ける準備の仕方
- git cloneをします
    - `git clone git@github.com:teaching01/network-cdk.git`
- cloneしたディレクトリに移ります
    - `cd network-cdk`
- starterブランチに変えます
    - `git switch starter`
- ライブラリをインストールします
    - `npm install`
- .envファイルを作成します
    - `cp .env.tpl .env`
- .envファイルの値を埋めます
    - AWS_ACCOUNTはご自身のAWSアカウントを入れてください
        - 12桁の数字です
    - AWS_REGIONはお使いのAWSリージョンを入れてください
        - 日本にお住まいの方はap-northeast-1で大丈夫かと思います
- 以上です

## レッスン中に使用するコマンド
- public ec2へsshするコマンド
```
ssh -i network-cdk.pem ec2-user@${ip address}
```
- private ec2へsshするコマンド
```
ssh -i network-cdk.pem \
    -o ProxyCommand='ssh -i network-cdk.pem -W %h:%p ec2-user@${public ec2のip address}' \
    ec2-user@${privat ec2のip address}
```
- private ec2へsftpするコマンド
```
sftp -i network-cdk.pem \
    -o ProxyCommand='ssh -i network-cdk.pem -W %h:%p ec2-user@${public ec2のip address}' \
    ec2-user@${privat ec2のip address}
```

## cdkでoutputsに入力するコード
```
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
```
