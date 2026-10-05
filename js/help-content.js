/**
 * Provider-aware contextual help for complex configuration choices.
 * Content is static and rendered as text by App to avoid injecting HTML.
 */
class HelpContent {
  static topics = {
    'pricing-tier': {
      aws: {
        title: 'Databricks pricing tier',
        overview: 'The pricing tier determines which workspace networking and security capabilities are available. In this project, Back-end PrivateLink requires the Enterprise tier.',
        considerations: [
          'Premium supports the standard workspace topology.',
          'Enterprise is required when Back-end PrivateLink is enabled.'
        ],
        links: [
          { label: 'Databricks pricing', url: 'https://www.databricks.com/product/pricing' }
        ]
      },
      azure: {
        title: 'Databricks pricing tier',
        overview: 'This project creates an Azure Databricks Premium workspace because the generated topology uses features that are not available in the Standard tier.',
        considerations: [
          'Premium is selected automatically and is the only supported option in this flow.',
          'Back-end Private Link also requires the Premium tier.'
        ],
        links: [
          { label: 'Azure Databricks pricing', url: 'https://azure.microsoft.com/en-us/pricing/details/databricks/' }
        ]
      }
    },
    metastore: {
      aws: {
        title: 'Unity Catalog metastore',
        overview: 'A metastore is the top-level Unity Catalog container for data and AI assets in a region. The workspace must be assigned to one metastore.',
        whenToUse: [
          'Create a new metastore when the account does not already have an appropriate regional metastore.',
          'Attach an existing metastore when governance is already centralized in the selected region.'
        ],
        considerations: [
          'An existing metastore must belong to the same Databricks account and be available for the workspace region.',
          'Creating a metastore requires the account-level permissions used by the generated Terraform project.'
        ],
        links: [
          { label: 'Create a Unity Catalog metastore on AWS', url: 'https://docs.databricks.com/aws/en/data-governance/unity-catalog/create-metastore' }
        ]
      },
      azure: {
        title: 'Unity Catalog metastore',
        overview: 'A metastore is the top-level Unity Catalog container for data and AI assets in a region. The standard Azure flow assigns the workspace to a new or existing metastore.',
        whenToUse: [
          'Create a new metastore for an independent regional governance boundary.',
          'Attach an existing metastore to use an established governance boundary.'
        ],
        considerations: [
          'The existing metastore must be in the same region as the workspace.',
          'The Azure Back-end Private Link source does not expose this metastore choice in the application.'
        ],
        links: [
          { label: 'Create a Unity Catalog metastore on Azure', url: 'https://learn.microsoft.com/en-us/azure/databricks/data-governance/unity-catalog/create-metastore' }
        ]
      }
    },
    'network-mode': {
      aws: {
        title: 'New or existing VPC',
        overview: 'Choose whether Terraform creates the complete workspace VPC or connects the workspace to network resources you already manage.',
        whenToUse: [
          'Create a new VPC for an isolated deployment managed entirely by this Terraform project.',
          'Use an existing VPC when networking is centrally managed or must connect to established routes and controls.'
        ],
        considerations: [
          'Existing-VPC mode requires at least two private subnets in different Availability Zones and an existing security group.',
          'When Back-end PrivateLink is enabled with an existing VPC, existing REST API and SCC relay VPC endpoints are also required.'
        ],
        links: [
          { label: 'Customer-managed VPC requirements', url: 'https://docs.databricks.com/aws/en/security/network/classic/customer-managed-vpc' }
        ]
      },
      azure: {
        title: 'New or existing VNet',
        overview: 'Choose whether Terraform creates a dedicated VNet or adds the required delegated Databricks subnets to a VNet you already manage.',
        whenToUse: [
          'Create a new VNet for an isolated deployment owned by this project.',
          'Use an existing VNet when connectivity, routing, or security is managed centrally.'
        ],
        considerations: [
          'The calculated subnet CIDRs must be unused in an existing VNet.',
          'The Back-end Private Link flow requires a new dedicated VNet and disables this choice.'
        ],
        links: [
          { label: 'Deploy Azure Databricks in a customer-managed VNet', url: 'https://learn.microsoft.com/en-us/azure/databricks/security/network/classic/vnet-inject' }
        ]
      }
    },
    'nat-gateway': {
      aws: {
        title: 'NAT gateway mode',
        overview: 'A NAT gateway gives nodes in private subnets outbound internet access without accepting unsolicited inbound internet connections.',
        whenToUse: [
          'Single NAT gateway minimizes cost but introduces a shared, cross-zone egress dependency.',
          'One per Availability Zone keeps egress zonally local and improves resilience at higher cost.',
          'No NAT is appropriate only when all required traffic uses private endpoints or controlled routing.'
        ],
        considerations: [
          'No-NAT mode requires Back-end PrivateLink and the required private AWS service endpoints.',
          'PrivateLink does not provide general internet access for workloads.'
        ],
        links: [
          { label: 'AWS NAT gateways', url: 'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html' }
        ]
      },
      azure: {
        title: 'NAT gateway mode',
        overview: 'An Azure NAT Gateway provides explicit outbound internet connectivity for workspace subnets through a public IP address.',
        whenToUse: [
          'Deploy a NAT gateway when clusters require general outbound internet access.',
          'Select no NAT only when required egress is covered by service endpoints, Private Link, or routes through a firewall or network virtual appliance.'
        ],
        considerations: [
          'Back-end Private Link secures control-plane communication but does not provide general internet access.',
          'Validate all required package repositories and external services before choosing no NAT.'
        ],
        links: [
          { label: 'Azure NAT Gateway overview', url: 'https://learn.microsoft.com/en-us/azure/nat-gateway/nat-overview' }
        ]
      },
      gcp: {
        title: 'Cloud NAT',
        overview: 'Cloud NAT gives Databricks nodes without public IP addresses outbound internet access while blocking unsolicited inbound connections.',
        whenToUse: [
          'Deploy Cloud NAT when clusters need public package repositories, public data sources, or other internet services.',
          'Choose no Cloud NAT only when an alternate controlled egress path covers every required destination.'
        ],
        considerations: [
          'Back-end Private Service Connect secures control-plane communication but does not provide general internet access.',
          'Private Google Access remains available without Cloud NAT for supported Google APIs and services.'
        ],
        links: [
          { label: 'Cloud NAT overview', url: 'https://cloud.google.com/nat/docs/overview' }
        ]
      }
    },
    'nat-placement': {
      azure: {
        title: 'NAT gateway placement',
        overview: 'Choose whether the NAT gateway and its public IP are regional resources or pinned to a specific Availability Zone.',
        whenToUse: [
          'Regional placement is the default for the Private Link flow and is not tied to one zone.',
          'Zonal placement is useful when the network architecture intentionally aligns egress with a selected zone.'
        ],
        considerations: [
          'Use regional placement in regions that do not support Availability Zones.',
          'The selected zone must be supported in the workspace region.'
        ],
        links: [
          { label: 'Azure NAT Gateway overview', url: 'https://learn.microsoft.com/en-us/azure/nat-gateway/nat-overview' },
          { label: 'Azure Availability Zones', url: 'https://learn.microsoft.com/en-us/azure/reliability/availability-zones-overview' }
        ]
      }
    },
    'availability-zones': {
      aws: {
        title: 'Availability Zones',
        overview: 'Availability Zones are separate infrastructure locations within an AWS region. Distributing workspace subnets across zones reduces dependence on a single location.',
        considerations: [
          'Select at least two distinct zones in the chosen region.',
          'The selection determines subnet placement and, in per-zone NAT mode, the number of NAT gateways created.',
          'Confirm that your AWS account exposes the selected zones because zone mappings can differ between accounts.'
        ],
        links: [
          { label: 'AWS Regions and Availability Zones', url: 'https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-availability-zones.html' }
        ]
      }
    },
    'subnet-sizing': {
      aws: {
        title: 'Subnet size',
        overview: 'Subnet size determines the address capacity available to Databricks compute in each selected Availability Zone.',
        considerations: [
          'Larger subnets support more concurrent nodes but consume more of the VPC address space.',
          'The calculator reserves the additional subnets required by the selected NAT and PrivateLink topology.',
          'Choose a size that leaves room for growth and does not overlap existing networks.'
        ],
        links: [
          { label: 'Databricks VPC and subnet requirements', url: 'https://docs.databricks.com/aws/en/security/network/classic/customer-managed-vpc' }
        ]
      },
      azure: {
        title: 'Subnet size',
        overview: 'The selected prefix controls the address capacity of the delegated Azure Databricks workspace subnets.',
        considerations: [
          'Azure reserves five addresses in every subnet.',
          'Each cluster node consumes addresses in both the host and container subnets.',
          'Choose non-overlapping CIDRs with enough capacity for expected growth.'
        ],
        links: [
          { label: 'Azure Databricks VNet injection requirements', url: 'https://learn.microsoft.com/en-us/azure/databricks/security/network/classic/vnet-inject' }
        ]
      },
      gcp: {
        title: 'Databricks subnet CIDR',
        overview: 'This CIDR defines the primary IPv4 range of the regional subnet created for Databricks compute in the new VPC.',
        considerations: [
          'Use a private, non-overlapping range that leaves sufficient addresses for expected compute growth.',
          'The generated project also creates the required network, router, and Cloud NAT resources.',
          'Changing the CIDR after deployment can require resource replacement.'
        ],
        links: [
          { label: 'Databricks customer-managed VPC on GCP', url: 'https://docs.databricks.com/gcp/en/security/network/classic/customer-managed-vpc' }
        ]
      }
    },
    'backend-private-link': {
      aws: {
        title: 'Back-end PrivateLink',
        overview: 'Back-end PrivateLink routes classic compute-plane communication to the Databricks control plane through private VPC endpoints instead of public IP addresses.',
        considerations: [
          'The generated topology covers the REST API and secure cluster connectivity relay endpoints.',
          'This is not front-end PrivateLink: users still access the workspace UI through its public URL.',
          'Enterprise tier is required. PrivateLink does not provide general internet egress for clusters.'
        ],
        links: [
          { label: 'AWS PrivateLink for classic compute', url: 'https://docs.databricks.com/aws/en/security/network/classic/privatelink' }
        ]
      },
      azure: {
        title: 'Back-end Private Link',
        overview: 'Back-end Private Link keeps classic compute-plane communication with the Azure Databricks control plane on private connectivity.',
        considerations: [
          'The generated topology configures Back-end and DBFS browser-authentication private endpoints.',
          'This flow does not configure front-end Private Link, so the workspace UI remains publicly accessible.',
          'Premium tier and a new dedicated VNet are required. Private Link does not provide general internet egress.'
        ],
        links: [
          { label: 'Azure Databricks Private Link concepts', url: 'https://learn.microsoft.com/en-us/azure/databricks/security/network/concepts/privatelink-concepts' }
        ]
      },
      gcp: {
        title: 'Back-end Private Service Connect',
        overview: 'Back-end Private Service Connect routes classic compute-plane communication to the Databricks control plane through private endpoints.',
        considerations: [
          'The generated topology creates separate REST API and secure cluster connectivity relay endpoints in the selected region.',
          'This does not configure front-end private access, so users continue to access the workspace through its public URL.',
          'A Databricks Enterprise plan is required. Private Service Connect does not provide general internet egress.'
        ],
        links: [
          { label: 'Private Service Connect for classic compute', url: 'https://docs.databricks.com/gcp/en/security/network/classic/private-service-connect' },
          { label: 'PSC attachment URIs by region', url: 'https://docs.databricks.com/gcp/en/resources/ip-domain-region#psc' }
        ]
      }
    },
    'gcp-service-account': {
      gcp: {
        title: 'Google service account',
        overview: 'The generated Terraform project uses this service account identity with both the Google and Databricks providers.',
        considerations: [
          'The person or automation running Terraform must be able to impersonate this service account.',
          'The caller needs the Service Account Token Creator role, and the service account needs permission to create the project network resources.',
          'Add the service account to the Databricks account and grant the account-level role required to create the workspace.'
        ],
        links: [
          { label: 'Service account impersonation', url: 'https://cloud.google.com/docs/authentication/use-service-account-impersonation' }
        ]
      }
    }
  };

  static getTopic(topicId, provider) {
    const topic = this.topics[topicId];
    if (!topic) return null;
    return topic[provider] || topic.default || null;
  }
}

if (typeof window !== 'undefined') {
  window.HelpContent = HelpContent;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HelpContent;
}
