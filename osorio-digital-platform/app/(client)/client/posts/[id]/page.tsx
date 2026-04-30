/**
 * O detalhe do post para o cliente reutiliza a mesma page do social,
 * que já detecta o role e exibe os botões corretos (aprovar/reprovar).
 * Apenas redirecionamos para a rota canônica.
 */
import { redirect } from 'next/navigation'

interface PageProps {
  params: { id: string }
}

export default function ClientPostDetailPage({ params }: PageProps) {
  redirect(`/social/posts/${params.id}`)
}
