// AWS data collection service
// Assumes an IAM role via STS and fetches cost + resource data

export async function assumeRole(roleArn, externalId) {
  // TODO: implement STS AssumeRole
}

export async function fetchCostData(credentials) {
  // TODO: fetch last 3 months from Cost Explorer
}

export async function fetchEC2Data(credentials) {
  // TODO: fetch EC2 instances + CloudWatch CPU metrics
}

export async function fetchRDSData(credentials) {
  // TODO: fetch RDS instances
}

export async function fetchUnusedResources(credentials) {
  // TODO: fetch unattached EBS, unassociated EIPs, idle LBs, idle NAT GWs
}
