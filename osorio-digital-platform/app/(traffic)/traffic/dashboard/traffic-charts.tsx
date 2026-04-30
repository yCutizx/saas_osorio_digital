'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SpendAreaChart, type SpendDataPoint }    from '@/components/charts/spend-area-chart'
import { CampaignBarChart, type CampaignDataPoint } from '@/components/charts/campaign-bar-chart'

interface Props {
  areaData:     SpendDataPoint[]
  campaignData: CampaignDataPoint[]
}

export function TrafficCharts({ areaData, campaignData }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Investimento vs. Receita ao longo do tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SpendAreaChart data={areaData} />
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Performance por Campanha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignBarChart data={campaignData} />
        </CardContent>
      </Card>
    </div>
  )
}
