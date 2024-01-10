import { BasePageObject } from "$tests/page-objects/base.page-object";
import type { PageObjectElement } from "$tests/types/page-object.types";
import { assertNonNullish } from "$tests/utils/utils.test-utils";

export class DissolveDelayBonusTextPo extends BasePageObject {
  private static readonly TID = "dissolve-delay-bonus-text-component";

  static under(element: PageObjectElement): DissolveDelayBonusTextPo {
    return new DissolveDelayBonusTextPo(
      element.byTestId(DissolveDelayBonusTextPo.TID)
    );
  }

  getTooltipText(): Promise<string> {
    return assertNonNullish(this.root.querySelector(".tooltip")).getText();
  }

  getText(): Promise<string> {
    return this.root.byTestId("dissolve-bonus-text").getText();
  }
}
